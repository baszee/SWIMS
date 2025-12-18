<?php
/**
 * =========================================================
 * FILE: api/approval.php - FIXED v4.4 (Final Secure)
 * Fitur: Hash Integrity + Snapshot Forensik + File Logging
 * =========================================================
 */
session_start();
include('../config/db_config.php');
include('../config/security_config.php');
include('../utils/ActivityLogger.php');

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// RATE LIMITING
$rateKey = 'api_rate_approval_' . ($_SESSION['user']['id'] ?? 'guest') . '_' . date('YmdHi');
$currentCount = $_SESSION[$rateKey] ?? 0;
if ($currentCount >= 10) api_response(false, "Rate limit exceeded", null, 429);
$_SESSION[$rateKey] = $currentCount + 1;

// SECURITY CHECK
if (!isset($_SESSION['user'])) api_response(false, "Akses ditolak", null, 401);
if ($_SESSION['user']['role'] !== 'supervisor') api_response(false, "Hanya Supervisor", null, 403);

$user_id = $_SESSION['user']['id'];
$username = $_SESSION['user']['username'];
$logger = new ActivityLogger($pdo);

// SESSION TIMEOUT
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 1800)) {
    session_destroy();
    api_response(false, "Session expired", null, 401);
}
$_SESSION['last_activity'] = time();

$method = $_SERVER['REQUEST_METHOD'];

try {
    // GET HANDLER (Untuk List Transaksi Pending)
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'transactions';
        if ($action === 'transactions') {
             $sql = "SELECT t.id, t.transaction_code, t.type, t.quantity, t.request_date, 
                           t.recipient_name, t.recipient_address, t.note,
                           i.sku, i.name AS item_name, i.unit, 
                           u.username AS requester_name, s.name AS supplier_name
                    FROM transactions t
                    JOIN items i ON t.item_id = i.id
                    JOIN users u ON t.request_by_user_id = u.id
                    LEFT JOIN suppliers s ON t.supplier_id = s.id
                    WHERE t.status = 'PENDING' ORDER BY t.request_date ASC";
            $stmt = $pdo->query($sql);
            api_response(true, "List Transaksi Pending", $stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($action === 'suppliers') {
            $sql = "SELECT s.id, s.name, s.contact_person, s.phone, s.address, 
                           u.username AS requester_name, s.created_at
                    FROM suppliers s
                    JOIN users u ON s.created_by_user_id = u.id
                    WHERE s.is_active = FALSE ORDER BY s.created_at ASC";
            $stmt = $pdo->query($sql);
            api_response(true, "List Supplier Pending", $stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }

    // POST HANDLER (Action Approve/Reject)
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? null;

        if (!$id) api_response(false, "ID required", null, 400);

        if ($action === 'approve_transaction') {
            $stmt = $pdo->prepare("
                SELECT t.*, i.sku, i.name as item_name, i.unit,
                       s.name as supplier_name, u_req.username as requester_name
                FROM transactions t
                JOIN items i ON t.item_id = i.id
                LEFT JOIN suppliers s ON t.supplier_id = s.id
                JOIN users u_req ON t.request_by_user_id = u_req.id
                WHERE t.id = ? AND t.status = 'PENDING'
            ");
            $stmt->execute([$id]);
            $trx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$trx) api_response(false, "Invalid transaction", null, 400);

            $pdo->beginTransaction();
            try {
                // Update stock
                $operator = ($trx['type'] === 'IN') ? '+' : '-';
                $pdo->prepare("UPDATE items SET current_stock = current_stock $operator ? WHERE id = ?")
                    ->execute([$trx['quantity'], $trx['item_id']]);

                // ✅ 1. SIAPKAN SNAPSHOT (DATA ASLI)
                // Paksa string untuk konsistensi hash
                $approval_timestamp = date('Y-m-d H:i:s');
                $snapshotArray = [
                    'transaction_code'  => (string)$trx['transaction_code'],
                    'type'              => (string)$trx['type'],
                    'item_id'           => (string)$trx['item_id'],
                    'sku'               => (string)$trx['sku'],
                    'quantity'          => (string)$trx['quantity'],
                    'recipient_name'    => (string)$trx['recipient_name'],
                    'recipient_address' => (string)$trx['recipient_address'],
                    'approval_date'     => (string)$approval_timestamp,
                    'approved_by'       => (string)$user_id
                    // NOTE: Secret Key TIDAK dimasukkan ke sini agar aman di DB
                ];
                
                $snapshotJSON = json_encode($snapshotArray);
                
                // ✅ 2. GENERATE HASH (Data + Key di Server)
                // Hash hanya valid jika Snapshot cocok dengan Secret Key
                $nota_hash = hash('sha256', $snapshotJSON . APP_SECRET_KEY);

                // ✅ 3. UPDATE DATABASE
                $sqlStatus = "UPDATE transactions 
                              SET status = 'APPROVED', 
                                  approved_by_user_id = ?, 
                                  approval_date = ?,
                                  nota_hash = ?,
                                  nota_snapshot = ?   
                              WHERE id = ?";
                $pdo->prepare($sqlStatus)->execute([$user_id, $approval_timestamp, $nota_hash, $snapshotJSON, $id]);

                // Auto-approve item (jika baru)
                $pdo->prepare("UPDATE items SET is_approved = TRUE WHERE id = ? AND is_approved = FALSE")->execute([$trx['item_id']]);

                $pdo->commit();

                // ✅ 4. FITUR TAMBAHAN: FILE LOGGING (BACKUP ANTI-HACK)
                // Simpan copy struk di folder logs (Harddisk)
                $logDir = '../logs/receipts/';
                if (!file_exists($logDir)) mkdir($logDir, 0777, true);
                
                $logFileContent = json_encode([
                    'timestamp' => date('Y-m-d H:i:s'),
                    'hash_signature' => $nota_hash,
                    'original_data' => $snapshotArray
                ], JSON_PRETTY_PRINT);
                
                file_put_contents($logDir . 'REC_' . $trx['transaction_code'] . '.json', $logFileContent);
                
                // Log Activity
                $logger->log($user_id, $username, 'APPROVE', "Approved transaction {$trx['transaction_code']}");
                
                // Response
                $completeTransaction = [
                    'transaction_code' => $trx['transaction_code'],
                    'type' => $trx['type'],
                    'status' => 'APPROVED',
                    'quantity' => $trx['quantity'],
                    'item_name' => $trx['item_name'],
                    'approval_date' => $approval_timestamp,
                    'nota_hash' => $nota_hash,
                    'approver_name' => $username,
                    'requester_name' => $trx['requester_name'],
                    'unit' => $trx['unit'],
                    'sku' => $trx['sku']
                ];
                
                api_response(true, "Approved with Secure Snapshot", ['transaction' => $completeTransaction, 'nota_hash' => $nota_hash]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Approval error: " . $e->getMessage());
                api_response(false, "Error: " . $e->getMessage(), null, 500);
            }
        }
        
        elseif ($action === 'reject_transaction') {
             $pdo->prepare("UPDATE transactions SET status = 'REJECTED', approved_by_user_id = ?, approval_date = NOW() WHERE id = ?")->execute([$user_id, $id]);
             api_response(true, "Rejected");
        }
        elseif ($action === 'approve_supplier') {
             $pdo->prepare("UPDATE suppliers SET is_active = TRUE WHERE id = ?")->execute([$id]);
             api_response(true, "Supplier Approved");
        }
        elseif ($action === 'reject_supplier') {
             $pdo->prepare("DELETE FROM suppliers WHERE id = ?")->execute([$id]);
             api_response(true, "Supplier Deleted");
        }
    }
} catch (PDOException $e) {
    api_response(false, "Server Error", null, 500);
}
?>  