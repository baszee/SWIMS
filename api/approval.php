<?php
// FILE: api/approval.php - FULL FIXED VERSION
// Fungsi: Menangani Approval dan Rejection (Transaksi & Supplier)
session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// 1. Cek Keamanan
if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

if ($user_role !== 'supervisor') {
    api_response(false, "Otorisasi ditolak. Hanya Supervisor.", null, 403);
}

// 2. Handle Request
$method = $_SERVER['REQUEST_METHOD'];

try {
    
    // --- GET DATA ---
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'transactions';
        
        if ($action === 'transactions') {
            $sql = "
                SELECT t.id, t.transaction_code, t.type, t.quantity, t.request_date, t.recipient_name,
                       i.sku, i.name AS item_name, i.unit, u.username AS requester_name, s.name AS supplier_name
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

    // --- POST ACTION (Approve/Reject) ---
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? null;

        if (!$id || empty($action)) {
            api_response(false, "ID dan Aksi wajib diisi.", null, 400);
        }

        // A. APPROVE TRANSAKSI
        if ($action === 'approve_transaction') {
            $stmt = $pdo->prepare("SELECT item_id, type, quantity FROM transactions WHERE id = ? AND status = 'PENDING'");
            $stmt->execute([$id]);
            $trx = $stmt->fetch();

            if (!$trx) api_response(false, "Transaksi tidak valid.", null, 400);

            $pdo->beginTransaction();
            try {
                $operator = ($trx['type'] === 'IN') ? '+' : '-';
                $sqlStock = "UPDATE items SET current_stock = current_stock $operator ? WHERE id = ?";
                $pdo->prepare($sqlStock)->execute([$trx['quantity'], $trx['item_id']]);

                $sqlStatus = "UPDATE transactions SET status = 'APPROVED', approved_by_user_id = ?, approval_date = NOW() WHERE id = ?";
                $pdo->prepare($sqlStatus)->execute([$user_id, $id]);

                $pdo->commit();
                api_response(true, "Transaksi APPROVED.");
            } catch (Exception $e) {
                $pdo->rollBack();
                api_response(false, "DB Error: " . $e->getMessage(), null, 500);
            }
        }

        // B. REJECT TRANSAKSI
        elseif ($action === 'reject_transaction') {
            $sql = "UPDATE transactions SET status = 'REJECTED', approved_by_user_id = ?, approval_date = NOW() WHERE id = ?";
            $pdo->prepare($sql)->execute([$user_id, $id]);
            api_response(true, "Transaksi REJECTED.");
        }

        // C. APPROVE SUPPLIER
        elseif ($action === 'approve_supplier') {
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = TRUE WHERE id = ?");
            $stmt->execute([$id]);
            api_response(true, "Supplier berhasil di-ACC.");
        }

        // D. REJECT SUPPLIER (Hapus Data)
        elseif ($action === 'reject_supplier') {
            $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ? AND is_active = FALSE");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                api_response(true, "Supplier ditolak dan dihapus.");
            } else {
                api_response(false, "Gagal menolak (mungkin sudah di-acc).", null, 400);
            }
        }
    }

} catch (PDOException $e) {
    api_response(false, "Server Error: " . $e->getMessage(), null, 500);
}
?>