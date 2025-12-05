<?php
// FILE: api/report.php
// Fungsi: Menyediakan data statistik, monitoring, dan riwayat transaksi untuk Owner & Staff.
session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// KEAMANAN: Memeriksa Otorisasi Sisi Server
// ----------------------------------------------------------------------

if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

// Owner dan Staff memiliki akses berbeda ke laporan
$allowed_roles = ['owner', 'staff'];
if (!in_array($user_role, $allowed_roles)) {
    api_response(false, "Otorisasi ditolak.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'summary';

    try {
        
        // =============================================================
        // ENDPOINT BARU: STAFF SUMMARY (action=staff_summary)
        // =============================================================
        if ($action === 'staff_summary' && $user_role === 'staff') {
             $stats = [];
            
            // A. Total Item Aktif (Approved)
            $stmt = $pdo->query("SELECT COUNT(id) as total_items FROM items WHERE is_approved = TRUE");
            $stats['total_items'] = (int)$stmt->fetchColumn();

            // B. Pending Masuk (IN)
            $stmt = $pdo->query("SELECT COUNT(id) FROM transactions WHERE type = 'IN' AND status = 'PENDING'");
            $stats['pending_in'] = (int)$stmt->fetchColumn();

            // C. Pending Keluar (OUT)
            $stmt = $pdo->query("SELECT COUNT(id) FROM transactions WHERE type = 'OUT' AND status = 'PENDING'");
            $stats['pending_out'] = (int)$stmt->fetchColumn();

            // D. Pending Item/Supplier Baru
            $stmt_items = $pdo->query("SELECT COUNT(id) FROM items WHERE is_approved = FALSE");
            $count_items = $stmt_items->fetchColumn();
            
            $stmt_suppliers = $pdo->query("SELECT COUNT(id) FROM suppliers WHERE is_active = FALSE");
            $count_suppliers = $stmt_suppliers->fetchColumn();
            
            $stats['pending_new_masters'] = $count_items + $count_suppliers;

            api_response(true, "Ringkasan data staff dashboard berhasil diambil.", $stats);
        }
        // =============================================================
        // ENDPOINT LAMA: OWNER REPORTS (action=summary, inventory, history)
        // =============================================================
        elseif ($user_role === 'owner') {

            if ($action === 'summary') {
                // Laporan 1: Ringkasan Statistik
                $stats = [];
                
                // A. Total Stok dan Item Aktif
                $stmt = $pdo->query("SELECT SUM(current_stock) as total_stock, COUNT(id) as total_items FROM items WHERE is_approved = TRUE");
                $stock_data = $stmt->fetch();
                $stats['total_stock'] = (int)($stock_data['total_stock'] ?? 0);
                $stats['total_items'] = (int)($stock_data['total_items'] ?? 0);

                // B. Status Approval Transaksi
                $stmt = $pdo->query("SELECT status, COUNT(id) as count FROM transactions GROUP BY status");
                $transaction_status = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $stats['transactions'] = [
                    'pending' => (int)($transaction_status['PENDING'] ?? 0),
                    'approved' => (int)($transaction_status['APPROVED'] ?? 0),
                    'rejected' => (int)($transaction_status['REJECTED'] ?? 0),
                ];

                // C. Item di bawah Stok Minimum (Peringatan)
                $stmt = $pdo->query("SELECT COUNT(id) FROM items WHERE is_approved = TRUE AND current_stock <= min_stock");
                $stats['low_stock'] = (int)$stmt->fetchColumn();

                // D. Item Baru PENDING Approval
                $stmt = $pdo->query("SELECT COUNT(id) FROM items WHERE is_approved = FALSE");
                $stats['pending_items'] = (int)$stmt->fetchColumn();


                api_response(true, "Ringkasan data monitoring berhasil diambil.", $stats);

            } elseif ($action === 'inventory') {
                // Laporan 2: Daftar Stok Lengkap (Stok per Item dan per Supplier)
                $sql = "
                    SELECT 
                        i.id, i.sku, i.name AS item_name, i.unit, i.current_stock, i.min_stock, i.is_approved,
                        s.name AS supplier_name
                    FROM items i
                    JOIN suppliers s ON i.supplier_id = s.id
                    ORDER BY s.name ASC, i.name ASC
                ";
                $stmt = $pdo->query($sql);
                $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Laporan inventaris lengkap berhasil diambil.", $inventory);
                
            } elseif ($action === 'history') {
                // Laporan 3: Riwayat Transaksi Lengkap
                $sql = "
                    SELECT 
                        t.id, t.transaction_code, t.type, t.quantity, t.note, t.status,
                        t.request_date, t.approval_date,
                        i.name AS item_name, i.sku,
                        u_req.username AS requester,
                        u_app.username AS approver,
                        s.name AS supplier_name,
                        r.name AS recipient_name
                    FROM transactions t
                    JOIN items i ON t.item_id = i.id
                    JOIN users u_req ON t.request_by_user_id = u_req.id
                    LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
                    LEFT JOIN suppliers s ON t.supplier_id = s.id
                    LEFT JOIN recipients r ON t.recipient_id = r.id
                    ORDER BY t.request_date DESC
                ";
                $stmt = $pdo->query($sql);
                $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Riwayat transaksi lengkap berhasil diambil.", $history);

            } else {
                api_response(false, "Aksi laporan tidak valid.", null, 400);
            }
        } else {
            api_response(false, "Aksi laporan tidak valid untuk role Anda.", null, 400);
        }

    } catch (\PDOException $e) {
        error_log("Database Error in report.php: " . $e->getMessage());
        api_response(false, "Kesalahan server database saat mengambil laporan.", null, 500);
    }
} else {
    api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
}
?>