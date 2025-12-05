<?php
// FILE: api/approval.php
// Fungsi: Menangani daftar PENDING dan mengeksekusi Approval/Rejection (Update Stok)
// Versi: 2.0 - Update untuk support recipient_name & recipient_address
session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// KEAMANAN: Memeriksa Session dan Otorisasi
// ----------------------------------------------------------------------

if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

// Hanya Supervisor yang boleh melihat dan mengeksekusi Approval
if ($user_role !== 'supervisor') {
    api_response(false, "Otorisasi ditolak. Hanya Supervisor yang dapat melakukan persetujuan.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar PENDING
        case 'GET':
            $action = $_GET['action'] ?? 'transactions';
            
            if ($action === 'transactions') {
                // Ambil semua transaksi yang masih PENDING
                $sql = "
                    SELECT 
                        t.id, 
                        t.transaction_code, 
                        t.type, 
                        t.quantity, 
                        t.note, 
                        t.request_date, 
                        t.status,
                        t.recipient_name,
                        t.recipient_address,
                        i.sku, 
                        i.name AS item_name, 
                        i.unit,
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
                $pending_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar transaksi PENDING berhasil diambil.", $pending_list);
            
            } elseif ($action === 'items') {
                // Ambil Item Baru yang masih belum disetujui
                $sql = "
                    SELECT 
                        i.id, 
                        i.sku, 
                        i.name, 
                        i.unit, 
                        i.min_stock, 
                        s.name AS supplier_name, 
                        u.username AS requester_name,
                        i.created_at
                    FROM items i
                    JOIN suppliers s ON i.supplier_id = s.id
                    JOIN users u ON i.created_by_user_id = u.id
                    WHERE i.is_approved = FALSE
                    ORDER BY i.created_at ASC
                ";
                $stmt = $pdo->query($sql);
                $pending_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar Item Baru PENDING berhasil diambil.", $pending_items);

            } elseif ($action === 'suppliers') {
                // Ambil Supplier Baru yang masih belum disetujui
                $sql = "
                    SELECT 
                        s.id, 
                        s.name, 
                        s.contact_person, 
                        s.phone, 
                        s.address, 
                        u.username AS requester_name,
                        s.created_at
                    FROM suppliers s
                    JOIN users u ON s.created_by_user_id = u.id
                    WHERE s.is_active = FALSE
                    ORDER BY s.created_at ASC
                ";
                $stmt = $pdo->query($sql);
                $pending_suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar Supplier Baru PENDING berhasil diambil.", $pending_suppliers);
            }
            break;

        // UPDATE/AKSI: Mengeksekusi Approval/Rejection
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $action = $data['action'] ?? '';
            $id = $data['id'] ?? null;

            if (!$id || empty($action)) {
                api_response(false, "ID dan Aksi wajib diisi.", null, 400);
            }
            
            // ----------------------------------------------------------------------
            // A. APPROVE/REJECT TRANSAKSI
            // ----------------------------------------------------------------------
            if ($action === 'approve_transaction' || $action === 'reject_transaction') {
                
                $status = ($action === 'approve_transaction') ? 'APPROVED' : 'REJECTED';
                
                // Cek transaksi
                $stmt_trans = $pdo->prepare("SELECT item_id, type, quantity FROM transactions WHERE id = ? AND status = 'PENDING'");
                $stmt_trans->execute([$id]);
                $transaction = $stmt_trans->fetch(PDO::FETCH_ASSOC);

                if (!$transaction) {
                    api_response(false, "Transaksi tidak ditemukan atau status sudah diproses.", null, 404);
                }

                // Mulai SQL Transaction
                $pdo->beginTransaction();

                try {
                    if ($status === 'APPROVED') {
                        // Tentukan operasi stok
                        $operator = ($transaction['type'] === 'IN') ? '+' : '-';
                        
                        // 1. UPDATE STOK ITEM
                        $sql_update_stock = "UPDATE items SET current_stock = current_stock {$operator} ? WHERE id = ?";
                        $stmt_update_stock = $pdo->prepare($sql_update_stock);
                        $stmt_update_stock->execute([$transaction['quantity'], $transaction['item_id']]);
                        
                        if ($stmt_update_stock->rowCount() === 0) {
                             throw new Exception("Gagal update stok, item ID: {$transaction['item_id']} tidak ditemukan.");
                        }

                        // 2. UPDATE STATUS TRANSAKSI
                        $sql_update_trans = "UPDATE transactions SET status = ?, approved_by_user_id = ?, approval_date = NOW() WHERE id = ?";
                        $stmt_update_trans = $pdo->prepare($sql_update_trans);
                        $stmt_update_trans->execute([$status, $user_id, $id]);
                        
                    } else { // Jika REJECTED
                        // Hanya update status transaksi, stok tidak berubah
                        $sql_update_trans = "UPDATE transactions SET status = ?, approved_by_user_id = ?, approval_date = NOW() WHERE id = ?";
                        $stmt_update_trans = $pdo->prepare($sql_update_trans);
                        $stmt_update_trans->execute([$status, $user_id, $id]);
                    }

                    // Commit
                    $pdo->commit();
                    api_response(true, "Transaksi ID:{$id} berhasil di{$status} dan stok diperbarui.", null);

                } catch (Exception $e) {
                    $pdo->rollBack();
                    error_log("SQL Transaction Failed in approval.php: " . $e->getMessage());
                    api_response(false, "Gagal mengeksekusi persetujuan/penolakan karena error database.", null, 500);
                }
                
            } 
            
            // ----------------------------------------------------------------------
            // B. APPROVE ITEM BARU
            // ----------------------------------------------------------------------
            elseif ($action === 'approve_item') {
                $stmt = $pdo->prepare("UPDATE items SET is_approved = TRUE WHERE id = ? AND is_approved = FALSE");
                $stmt->execute([$id]);
                
                if ($stmt->rowCount() > 0) {
                    api_response(true, "Item ID:{$id} berhasil disetujui dan siap digunakan dalam transaksi.", null);
                } else {
                    api_response(false, "Item tidak ditemukan atau sudah disetujui sebelumnya.", null, 404);
                }
            }

            // ----------------------------------------------------------------------
            // C. APPROVE SUPPLIER BARU
            // ----------------------------------------------------------------------
            elseif ($action === 'approve_supplier') {
                $stmt = $pdo->prepare("UPDATE suppliers SET is_active = TRUE WHERE id = ? AND is_active = FALSE");
                $stmt->execute([$id]);
                
                if ($stmt->rowCount() > 0) {
                    api_response(true, "Supplier ID:{$id} berhasil disetujui dan siap digunakan.", null);
                } else {
                    api_response(false, "Supplier tidak ditemukan atau sudah disetujui sebelumnya.", null, 404);
                }
            }
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in approval.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database umum.", null, 500);
}
?>