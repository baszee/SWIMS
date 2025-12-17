<?php
/**
 * =========================================================
 * FILE: api/approval.php - FIXED v4.1
 * Fix: Complete transaction data return with all required fields
 * =========================================================
 */
session_start();
include('../config/db_config.php');
include('../utils/ActivityLogger.php');

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ========================================
// RATE LIMITING (10 requests per minute)
// ========================================
$rateKey = 'api_rate_approval_' . ($_SESSION['user']['id'] ?? 'guest') . '_' . date('YmdHi');
$currentCount = $_SESSION[$rateKey] ?? 0;

if ($currentCount >= 10) {
    http_response_code(429);
    api_response(false, "Terlalu banyak request. Tunggu 1 menit.", null, 429);
}
$_SESSION[$rateKey] = $currentCount + 1;

// ========================================
// SECURITY CHECK
// ========================================
if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];
$username = $_SESSION['user']['username'];

if ($user_role !== 'supervisor') {
    api_response(false, "Otorisasi ditolak. Hanya Supervisor.", null, 403);
}

// Initialize logger
$logger = new ActivityLogger($pdo);

// ========================================
// SESSION TIMEOUT CHECK (30 minutes)
// ========================================
if (isset($_SESSION['last_activity'])) {
    $elapsed = time() - $_SESSION['last_activity'];
    if ($elapsed > 1800) { // 30 minutes
        session_destroy();
        api_response(false, "Session expired. Silakan login kembali.", null, 401);
    }
}
$_SESSION['last_activity'] = time();

// ========================================
// REQUEST HANDLER
// ========================================
$method = $_SERVER['REQUEST_METHOD'];

try {
    
    // ====================================================================
    // GET: Retrieve Pending Transactions or Suppliers
    // ====================================================================
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'transactions';
        
        if ($action === 'transactions') {
            $sql = "
                SELECT t.id, t.transaction_code, t.type, t.quantity, t.request_date, 
                       t.recipient_name, t.recipient_address, t.note,
                       i.sku, i.name AS item_name, i.unit, 
                       u.username AS requester_name, 
                       s.name AS supplier_name
                FROM transactions t
                JOIN items i ON t.item_id = i.id
                JOIN users u ON t.request_by_user_id = u.id
                LEFT JOIN suppliers s ON t.supplier_id = s.id
                WHERE t.status = 'PENDING'
                ORDER BY t.request_date ASC
            ";
            $stmt = $pdo->query($sql);
            api_response(true, "List Transaksi Pending", $stmt->fetchAll(PDO::FETCH_ASSOC));
        
        } elseif ($action === 'suppliers') {
            $sql = "
                SELECT s.id, s.name, s.contact_person, s.phone, s.address, 
                       u.username AS requester_name, s.created_at
                FROM suppliers s
                JOIN users u ON s.created_by_user_id = u.id
                WHERE s.is_active = FALSE
                ORDER BY s.created_at ASC
            ";
            $stmt = $pdo->query($sql);
            api_response(true, "List Supplier Pending", $stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }

    // ====================================================================
    // POST: Approve/Reject Actions
    // ====================================================================
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? null;

        if (!$id || empty($action)) {
            api_response(false, "ID dan Aksi wajib diisi.", null, 400);
        }

        // ================================================================
        // A. APPROVE TRANSAKSI (dengan Hash Signature)
        // ================================================================
        if ($action === 'approve_transaction') {
            // ✅ FIX: Query dengan JOIN lengkap untuk ambil SEMUA data
            $stmt = $pdo->prepare("
                SELECT 
                    t.*,
                    i.sku, 
                    i.name as item_name, 
                    i.unit,
                    s.name as supplier_name,
                    u_req.username as requester_name
                FROM transactions t
                JOIN items i ON t.item_id = i.id
                LEFT JOIN suppliers s ON t.supplier_id = s.id
                JOIN users u_req ON t.request_by_user_id = u_req.id
                WHERE t.id = ? AND t.status = 'PENDING'
            ");
            $stmt->execute([$id]);
            $trx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$trx) api_response(false, "Transaksi tidak valid atau sudah diproses.", null, 400);

            $pdo->beginTransaction();
            try {
                // Update stock
                $operator = ($trx['type'] === 'IN') ? '+' : '-';
                $sqlStock = "UPDATE items SET current_stock = current_stock $operator ? WHERE id = ?";
                $pdo->prepare($sqlStock)->execute([$trx['quantity'], $trx['item_id']]);

                // ✅ GENERATE HASH SIGNATURE (SHA-256)
                $approval_timestamp = date('Y-m-d H:i:s');
                $hashData = json_encode([
                    'transaction_code' => $trx['transaction_code'],
                    'type' => $trx['type'],
                    'item_id' => $trx['item_id'],
                    'sku' => $trx['sku'],
                    'quantity' => $trx['quantity'],
                    'approval_date' => $approval_timestamp,
                    'approved_by' => $user_id,
                    'secret_salt' => 'SWIMS_2025_SECRET_SALT'
                ]);
                $nota_hash = hash('sha256', $hashData);

                // Update transaction
                $sqlStatus = "UPDATE transactions 
                              SET status = 'APPROVED', 
                                  approved_by_user_id = ?, 
                                  approval_date = ?,
                                  nota_hash = ?
                              WHERE id = ?";
                $pdo->prepare($sqlStatus)->execute([$user_id, $approval_timestamp, $nota_hash, $id]);

                // Auto-approve item jika masih pending
                $sqlApproveItem = "UPDATE items SET is_approved = TRUE WHERE id = ? AND is_approved = FALSE";
                $pdo->prepare($sqlApproveItem)->execute([$trx['item_id']]);

                $pdo->commit();
                
                // Log activity
                $logger->log(
                    $user_id,
                    $username,
                    'APPROVE',
                    "Approved transaction {$trx['transaction_code']} with hash signature",
                    [
                        'transaction_id' => $id,
                        'transaction_code' => $trx['transaction_code'],
                        'type' => $trx['type'],
                        'nota_hash' => $nota_hash
                    ]
                );
                
                // ✅ FIX: Tambahkan SEMUA field yang dibutuhkan PDF generator
                $completeTransaction = [
                    'id' => $trx['id'],
                    'transaction_code' => $trx['transaction_code'],
                    'type' => $trx['type'],
                    'status' => 'APPROVED',
                    'item_id' => $trx['item_id'],
                    'sku' => $trx['sku'],
                    'item_name' => $trx['item_name'],
                    'name' => $trx['item_name'], // Alias untuk compatibility
                    'unit' => $trx['unit'],
                    'quantity' => $trx['quantity'],
                    'note' => $trx['note'],
                    'request_date' => $trx['request_date'],
                    'approval_date' => $approval_timestamp,
                    'nota_hash' => $nota_hash,
                    'approver' => $username, // ✅ FIXED
                    'approver_name' => $username, // ✅ FIXED
                    'requester' => $trx['requester_name'], // ✅ FIXED
                    'requester_name' => $trx['requester_name'], // ✅ FIXED
                    'supplier_name' => $trx['supplier_name'],
                    'recipient_name' => $trx['recipient_name'],
                    'recipient_address' => $trx['recipient_address']
                ];
                
                api_response(true, "Transaksi APPROVED dengan signature hash", [
                    'transaction' => $completeTransaction,
                    'nota_hash_preview' => substr($nota_hash, 0, 16) . '...'
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Approval error: " . $e->getMessage());
                api_response(false, "DB Error: " . $e->getMessage(), null, 500);
            }
        }

        // ================================================================
        // B. REJECT TRANSAKSI
        // ================================================================
        elseif ($action === 'reject_transaction') {
            $sql = "UPDATE transactions SET status = 'REJECTED', approved_by_user_id = ?, approval_date = NOW() WHERE id = ?";
            $pdo->prepare($sql)->execute([$user_id, $id]);
            
            $logger->log($user_id, $username, 'REJECT', "Rejected transaction ID: {$id}");
            
            api_response(true, "Transaksi REJECTED.");
        }

        // ================================================================
        // C. APPROVE SUPPLIER
        // ================================================================
        elseif ($action === 'approve_supplier') {
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = TRUE WHERE id = ?");
            $stmt->execute([$id]);
            
            $logger->log($user_id, $username, 'APPROVE', "Approved supplier ID: {$id}");
            
            api_response(true, "Supplier berhasil di-ACC.");
        }

        // ================================================================
        // D. REJECT SUPPLIER
        // ================================================================
        elseif ($action === 'reject_supplier') {
            $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ? AND is_active = FALSE");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                $logger->log($user_id, $username, 'REJECT', "Rejected and deleted supplier ID: {$id}");
                
                api_response(true, "Supplier ditolak dan dihapus.");
            } else {
                api_response(false, "Gagal menolak (mungkin sudah di-acc).", null, 400);
            }
        }
    }

} catch (PDOException $e) {
    error_log("Database error in approval.php: " . $e->getMessage());
    api_response(false, "Server Error: " . $e->getMessage(), null, 500);
}
?>