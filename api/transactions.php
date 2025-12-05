<?php
// FILE: api/transactions.php
// Fungsi: Menerima permintaan Barang Masuk (IN) atau Barang Keluar (OUT) dari Staff
// Versi: 2.3 - FIX Kritis: Memperbaiki error saat submit dan GET my_history
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

// Hanya Staff yang boleh mengajukan transaksi
if ($user_role !== 'staff') {
    api_response(false, "Otorisasi ditolak. Hanya Staff yang dapat membuat permintaan transaksi.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        
        // =====================================================================
        // GET: Mengambil Riwayat Transaksi User Saat Ini (action=my_history)
        // =====================================================================
        case 'GET':
            $action = $_GET['action'] ?? 'my_history';
            
            if ($action === 'my_history') {
                $type = $_GET['type'] ?? 'ALL';
                
                // Query yang Disesuaikan: Pastikan semua kolom diambil dengan benar
                $sql = "
                    SELECT 
                        t.id, 
                        t.transaction_code, 
                        t.type, 
                        t.quantity, 
                        t.status,
                        t.request_date,
                        t.approval_date,
                        t.note,
                        t.recipient_name,
                        i.sku, 
                        i.name AS item_name, 
                        i.unit,
                        s.name AS supplier_name,
                        u_app.username AS approver_name
                    FROM transactions t
                    JOIN items i ON t.item_id = i.id
                    LEFT JOIN suppliers s ON t.supplier_id = s.id
                    LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id /* LEFT JOIN untuk approver yang NULL */
                    WHERE t.request_by_user_id = ?
                ";
                
                $params = [$user_id];
                if ($type !== 'ALL') {
                    $sql .= " AND t.type = ?";
                    $params[] = $type;
                }
                
                $sql .= " ORDER BY t.request_date DESC LIMIT 20";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Riwayat transaksi berhasil diambil.", $history);
            }
            break;
        
        // =====================================================================
        // POST: Membuat Permintaan Barang Masuk (IN) atau Barang Keluar (OUT)
        // =====================================================================
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            $type = $data['type'] ?? ''; 
            $item_id = $data['item_id'] ?? null;
            $quantity = (int)($data['quantity'] ?? 0);
            $note = $data['note'] ?? '';
            
            if (empty($type) || !in_array($type, ['IN', 'OUT']) || !$item_id || $quantity <= 0) {
                api_response(false, "Data input tidak lengkap atau tidak valid.", null, 400);
            }
            
            $stmt_item = $pdo->prepare("SELECT is_approved, supplier_id, current_stock, name FROM items WHERE id = ?");
            $stmt_item->execute([$item_id]);
            $item = $stmt_item->fetch();
            
            if (!$item || !$item['is_approved']) {
                api_response(false, "Item tidak ditemukan atau belum disetujui.", null, 403);
            }
            
            $prefix = ($type === 'IN') ? 'BM' : 'BK';
            $date_part = date('Ymd');
            $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE transaction_code LIKE ?");
            $stmt_count->execute(["{$prefix}-{$date_part}%"]);
            $count = $stmt_count->fetchColumn() + 1;
            $transaction_code = "{$prefix}-{$date_part}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
            
            
            // =====================================================================
            // A. BARANG MASUK (IN)
            // =====================================================================
            if ($type === 'IN') {
                $supplier_id = $data['supplier_id'] ?? null;
                
                if (!$supplier_id) {
                    api_response(false, "Supplier wajib dipilih untuk Barang Masuk.", null, 400);
                }
                
                $stmt_supplier = $pdo->prepare("SELECT is_active FROM suppliers WHERE id = ?");
                $stmt_supplier->execute([$supplier_id]);
                $supplier = $stmt_supplier->fetch();
                
                if (!$supplier || !$supplier['is_active']) {
                    api_response(false, "Supplier tidak ditemukan atau masih PENDING approval. Hubungi Supervisor.", null, 403);
                }
                
                if ($item['supplier_id'] != $supplier_id) {
                    api_response(false, "Item yang dipilih tidak sesuai dengan Supplier yang terpilih.", null, 400);
                }
                
                $sql = "INSERT INTO transactions 
                        (transaction_code, item_id, type, quantity, note, supplier_id, request_by_user_id, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                
                $params = [$transaction_code, $item_id, $type, $quantity, $note, $supplier_id, $user_id];
            
            }
            
            // =====================================================================
            // B. BARANG KELUAR (OUT)
            // =====================================================================
            elseif ($type === 'OUT') {
                $recipient_name = trim($data['recipient_name'] ?? '');
                $recipient_address = trim($data['recipient_address'] ?? '');
                
                if (empty($recipient_name) || empty($recipient_address)) {
                    api_response(false, "Nama dan Alamat Penerima wajib diisi untuk Barang Keluar.", null, 400);
                }
                
                if ($quantity > $item['current_stock']) {
                    api_response(false, "Jumlah barang keluar ({$quantity}) melebihi stok tersedia ({$item['current_stock']}).", null, 400);
                }
                
                $sql = "INSERT INTO transactions 
                        (transaction_code, item_id, type, quantity, note, recipient_name, recipient_address, request_by_user_id, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                
                $params = [$transaction_code, $item_id, $type, $quantity, $note, $recipient_name, $recipient_address, $user_id];
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            api_response(true, "Permintaan {$prefix} berhasil diajukan. Kode: {$transaction_code}. Status: PENDING menanti Supervisor.", ['code' => $transaction_code], 201);
            
            break;
            
        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in transactions.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database saat membuat transaksi.", null, 500);
}
?>