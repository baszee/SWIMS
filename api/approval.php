<?php
/**
 * =========================================================
 * FILE: api/approval.php - FIXED v4.6 (Final Secure + CSRF)
 * Fitur: Hash Integrity + Snapshot Forensik + File Logging + CSRF Protection
 * =========================================================
 */
session_start();
include('../config/db_config.php');
include('../config/security_config.php');
include('../utils/ActivityLogger.php');
include('../utils/SessionManager.php');     // ✅ Session Manager
include('../utils/CsrfProtection.php');     // ✅ CSRF Protection

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// 1. KEAMANAN SESSION & ROLE
// ----------------------------------------------------------------------
SessionManager::requireAuth();
SessionManager::requireRole('supervisor'); // HANYA SUPERVISOR

$user = SessionManager::getUser();
$user_id = $user['id'];
$username = $user['username'];
$logger = new ActivityLogger($pdo);

// ----------------------------------------------------------------------
// 2. CEK CSRF TOKEN (Untuk POST Request)
// ----------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = CsrfProtection::getTokenFromRequest();
    if (!CsrfProtection::validateToken($token)) {
        api_response(false, "Security Error: Invalid CSRF token. Silakan refresh halaman.", null, 403);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    // ==================================================================
    // GET: AMBIL DAFTAR TRANSAKSI PENDING
    // ==================================================================
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
        } 
        elseif ($action === 'suppliers') {
            $sql = "SELECT s.id, s.name, s.contact_person, s.phone, s.address, 
                           u.username AS requester_name, s.created_at
                    FROM suppliers s
                    JOIN users u ON s.created_by_user_id = u.id
                    WHERE s.is_active = FALSE ORDER BY s.created_at ASC";
            $stmt = $pdo->query($sql);
            api_response(true, "List Supplier Pending", $stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }

    // ==================================================================
    // POST: EKSEKUSI APPROVE / REJECT
    // ==================================================================
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? null;

        if (!$id) api_response(false, "ID required", null, 400);

        // --- ACTION: APPROVE TRANSACTION ---
        if ($action === 'approve_transaction') {
            // 1. Ambil Data Lengkap Transaksi
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

            if (!$trx) api_response(false, "Invalid transaction or already processed", null, 400);

            $pdo->beginTransaction();
            try {
                // 2. Update Stok Barang
                $operator = ($trx['type'] === 'IN') ? '+' : '-';
                $pdo->prepare("UPDATE items SET current_stock = current_stock $operator ? WHERE id = ?")
                    ->execute([$trx['quantity'], $trx['item_id']]);

                // 3. SIAPKAN SNAPSHOT (Data Asli untuk Forensik)
                $approval_timestamp = date('Y-m-d H:i:s');
                $snapshotArray = [
                    'transaction_code'  => (string)$trx['transaction_code'],
                    'type'              => (string)$trx['type'],
                    'item_id'           => (string)$trx['item_id'],
                    'sku'               => (string)$trx['sku'],
                    'quantity'          => (string)$trx['quantity'],
                    'recipient_name'    => (string)$trx['recipient_name'], // Penting!
                    'recipient_address' => (string)$trx['recipient_address'], // Penting!
                    'approval_date'     => (string)$approval_timestamp,
                    'approved_by'       => (string)$user_id
                ];
                
                $snapshotJSON = json_encode($snapshotArray);
                
                // 4. GENERATE HASH (Digital Signature)
                $nota_hash = hash('sha256', $snapshotJSON . APP_SECRET_KEY);

                // 5. UPDATE DATABASE
                $sqlStatus = "UPDATE transactions 
                              SET status = 'APPROVED', 
                                  approved_by_user_id = ?, 
                                  approval_date = ?,
                                  nota_hash = ?,
                                  nota_snapshot = ?   
                              WHERE id = ?";
                $pdo->prepare($sqlStatus)->execute([$user_id, $approval_timestamp, $nota_hash, $snapshotJSON, $id]);

                // 6. Auto-approve Item (Jika item baru dibuat lewat transaksi)
                $pdo->prepare("UPDATE items SET is_approved = TRUE WHERE id = ? AND is_approved = FALSE")->execute([$trx['item_id']]);

                $pdo->commit();

                // 7. FILE LOGGING (Backup di Server)
                $logDir = '../logs/receipts/';
                if (!file_exists($logDir)) mkdir($logDir, 0777, true);
                
                $logFileContent = json_encode([
                    'timestamp' => date('Y-m-d H:i:s'),
                    'hash_signature' => $nota_hash,
                    'original_data' => $snapshotArray
                ], JSON_PRETTY_PRINT);
                
                file_put_contents($logDir . 'REC_' . $trx['transaction_code'] . '.json', $logFileContent);
                
                // 8. LOG AKTIVITAS
                $logger->log($user_id, $username, 'APPROVE', "Approved transaction {$trx['transaction_code']}");
                
                // ✅ 9. RESPONSE DATA LENGKAP (AGAR PDF SAMA DENGAN HISTORY)
                // Bagian ini yang saya perbaiki agar data Recipient, Address, Note ikut terkirim
                $completeTransaction = [
                    'transaction_code' => $trx['transaction_code'],
                    'type'             => $trx['type'],
                    'status'           => 'APPROVED',
                    'quantity'         => $trx['quantity'],
                    'item_name'        => $trx['item_name'],
                    'sku'              => $trx['sku'],
                    'unit'             => $trx['unit'],
                    
                    // Waktu & User
                    'request_date'     => $trx['request_date'],  // ✅ TAMBAHAN BARU
                    'approval_date'    => $approval_timestamp,
                    'approver_name'    => $username,
                    'requester_name'   => $trx['requester_name'],
                    
                    // Data Pelengkap
                    'recipient_name'    => $trx['recipient_name'],
                    'recipient_address' => $trx['recipient_address'],
                    'supplier_name'     => $trx['supplier_name'],
                    'note'              => $trx['note'],
                    
                    // Security
                    'nota_hash'         => $nota_hash
                ];
                
                api_response(true, "Approved with Secure Snapshot", ['transaction' => $completeTransaction, 'nota_hash' => $nota_hash]);
                
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                error_log("Approval error: " . $e->getMessage());
                api_response(false, "Error: " . $e->getMessage(), null, 500);
            }
        }
        
        // --- ACTION: REJECT TRANSACTION ---
        elseif ($action === 'reject_transaction') {
             $pdo->prepare("UPDATE transactions SET status = 'REJECTED', approved_by_user_id = ?, approval_date = NOW() WHERE id = ?")->execute([$user_id, $id]);
             $logger->log($user_id, $username, 'REJECT', "Rejected transaction ID $id");
             api_response(true, "Rejected");
        }
        
        // --- ACTION: APPROVE SUPPLIER ---
        elseif ($action === 'approve_supplier') {
             $pdo->prepare("UPDATE suppliers SET is_active = TRUE WHERE id = ?")->execute([$id]);
             $logger->log($user_id, $username, 'APPROVE_SUPPLIER', "Approved supplier ID $id");
             api_response(true, "Supplier Approved");
        }
        
        // --- ACTION: REJECT SUPPLIER ---
        elseif ($action === 'reject_supplier') {
             $pdo->prepare("DELETE FROM suppliers WHERE id = ?")->execute([$id]);
             $logger->log($user_id, $username, 'REJECT_SUPPLIER', "Rejected (Deleted) supplier ID $id");
             api_response(true, "Supplier Deleted");
        }
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    api_response(false, "Server Error: " . $e->getMessage(), null, 500);
}
?>