<?php
// FILE: api/transactions.php
// Fungsi: Menerima permintaan Barang Masuk (IN) atau Barang Keluar (OUT) dari Staff
// Versi: 2.0 - Support recipient_name & recipient_address
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
        // GET: Mengambil Riwayat Transaksi User Saat Ini
        // =====================================================================
        case 'GET':
            $action = $_GET['action'] ?? 'my_history';
            
            if ($action === 'my_history') {
                $type = $_GET['type'] ?? 'ALL'; // 'IN', 'OUT', atau 'ALL'
                
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
                        t.recipient_address,
                        i.sku, 
                        i.name AS item_name, 
                        i.unit,
                        s.name AS supplier_name,
                        u_app.username AS approver_name
                    FROM transactions t
                    JOIN items i ON t.item_id = i.id
                    LEFT JOIN suppliers s ON t.supplier_id = s.id
                    LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
                    WHERE t.request_by_user_id = ?
                ";
                
                // Filter by type jika bukan 'ALL'
                if ($type !== 'ALL') {
                    $sql .= " AND t.type = ?";
                }
                
                $sql .= " ORDER BY t.request_date DESC LIMIT 20";
                
                $stmt = $pdo->prepare($sql);
                
                if ($type !== 'ALL') {
                    $stmt->execute([$user_id, $type]);
                } else {
                    $stmt->execute([$user_id]);
                }
                
                $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Riwayat transaksi berhasil diambil.", $history);
            }
            break;
        
        // =====================================================================
        // POST: Membuat Permintaan Barang Masuk (IN) atau Barang Keluar (OUT)
        // =====================================================================
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            $type = $data['type'] ?? ''; // 'IN' atau 'OUT'
            $item_id = $data['item_id'] ?? null;
            $quantity = (int)($data['quantity'] ?? 0);
            $note = $data['note'] ?? '';
            
            // Validasi input dasar
            if (empty($type) || !in_array($type, ['IN', 'OUT'])) {
                api_response(false, "Tipe transaksi tidak valid. Gunakan 'IN' atau 'OUT'.", null, 400);
            }
            
            if (!$item_id || $quantity <= 0) {
                api_response(false, "Item ID dan Jumlah wajib diisi dengan benar.", null, 400);
            }
            
            // =====================================================================
            // A. BARANG MASUK (IN)
            // =====================================================================
            if ($type === 'IN') {
                $supplier_id = $data['supplier_id'] ?? null;
                
                if (!$supplier_id) {
                    api_response(false, "Supplier wajib dipilih untuk Barang Masuk.", null, 400);
                }
                
                // Cek apakah supplier sudah disetujui (is_active = TRUE)
                $stmt_supplier = $pdo->prepare("SELECT is_active FROM suppliers WHERE id = ?");
                $stmt_supplier->execute([$supplier_id]);
                $supplier = $stmt_supplier->fetch();
                
                if (!$supplier) {
                    api_response(false, "Supplier tidak ditemukan.", null, 404);
                }
                
                if (!$supplier['is_active']) {
                    api_response(false, "Supplier masih PENDING approval. Hubungi Supervisor.", null, 403);
                }
                
                // Cek apakah item sudah disetujui (is_approved = TRUE)
                $stmt_item = $pdo->prepare("SELECT is_approved, supplier_id FROM items WHERE id = ?");
                $stmt_item->execute([$item_id]);
                $item = $stmt_item->fetch();
                
                if (!$item) {
                    api_response(false, "Item tidak ditemukan.", null, 404);
                }
                
                if (!$item['is_approved']) {
                    api_response(false, "Item masih PENDING approval. Hubungi Supervisor.", null, 403);
                }
                
                // Validasi: Item harus sesuai dengan Supplier
                if ($item['supplier_id'] != $supplier_id) {
                    api_response(false, "Item yang dipilih tidak sesuai dengan Supplier.", null, 400);
                }
                
                // Generate Transaction Code
                $prefix = 'BM';
                $date_part = date('Ymd');
                
                // Cari nomor urut terakhir hari ini
                $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE transaction_code LIKE ?");
                $stmt_count->execute(["{$prefix}-{$date_part}%"]);
                $count = $stmt_count->fetchColumn() + 1;
                
                $transaction_code = "{$prefix}-{$date_part}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
                
                // Insert Transaksi
                $sql = "INSERT INTO transactions 
                        (transaction_code, item_id, type, quantity, note, supplier_id, request_by_user_id, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $transaction_code, 
                    $item_id, 
                    $type, 
                    $quantity, 
                    $note, 
                    $supplier_id, 
                    $user_id
                ]);
                
                api_response(true, "Permintaan Barang Masuk berhasil diajukan. Kode: {$transaction_code}. Status: PENDING menanti Supervisor.", ['code' => $transaction_code], 201);
            
            }
            
            // =====================================================================
            // B. BARANG KELUAR (OUT)
            // =====================================================================
            elseif ($type === 'OUT') {
                $recipient_name = trim($data['recipient_name'] ?? '');
                $recipient_address = trim($data['recipient_address'] ?? '');
                
                if (empty($recipient_name)) {
                    api_response(false, "Nama Penerima wajib diisi untuk Barang Keluar.", null, 400);
                }
                
                if (empty($recipient_address)) {
                    api_response(false, "Alamat Penerima wajib diisi untuk Barang Keluar.", null, 400);
                }
                
                // Cek stok item
                $stmt_stock = $pdo->prepare("SELECT current_stock, is_approved, name FROM items WHERE id = ?");
                $stmt_stock->execute([$item_id]);
                $item = $stmt_stock->fetch();
                
                if (!$item) {
                    api_response(false, "Item tidak ditemukan.", null, 404);
                }
                
                if (!$item['is_approved']) {
                    api_response(false, "Item '{$item['name']}' belum disetujui (APPROVED) dan tidak bisa dikeluarkan.", null, 403);
                }
                
                if ($quantity > $item['current_stock']) {
                    api_response(false, "Jumlah barang keluar ({$quantity}) melebihi stok tersedia ({$item['current_stock']}).", null, 400);
                }
                
                // Generate Transaction Code
                $prefix = 'BK';
                $date_part = date('Ymd');
                
                $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE transaction_code LIKE ?");
                $stmt_count->execute(["{$prefix}-{$date_part}%"]);
                $count = $stmt_count->fetchColumn() + 1;
                
                $transaction_code = "{$prefix}-{$date_part}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
                
                // Insert Transaksi
                $sql = "INSERT INTO transactions 
                        (transaction_code, item_id, type, quantity, note, recipient_name, recipient_address, request_by_user_id, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $transaction_code, 
                    $item_id, 
                    $type, 
                    $quantity, 
                    $note, 
                    $recipient_name, 
                    $recipient_address, 
                    $user_id
                ]);
                
                api_response(true, "Permintaan Barang Keluar berhasil diajukan. Kode: {$transaction_code}. Status: PENDING menanti Supervisor.", ['code' => $transaction_code], 201);
            }
            
            break;
            
        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in transactions.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database saat membuat transaksi.", null, 500);
}
?>