<?php
// FILE: api/transactions.php
// Fungsi: Menerima permintaan Barang Masuk (IN) atau Barang Keluar (OUT) dari Staff.
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
        // CREATE: Membuat permintaan Barang Masuk (IN) atau Barang Keluar (OUT)
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $type = $data['type'] ?? ''; // 'IN' atau 'OUT'
            $item_id = $data['item_id'] ?? null;
            $quantity = (int)($data['quantity'] ?? 0);
            $note = $data['note'] ?? '';
            $master_id = $data['master_id'] ?? null; // supplier_id (IN) atau recipient_id (OUT)

            if (empty($type) || !$item_id || $quantity <= 0 || !$master_id) {
                api_response(false, "Data input tidak lengkap atau tidak valid.", null, 400);
            }
            
            // 1. Generate Transaction Code (Contoh: BM-YMD-001)
            $prefix = ($type === 'IN') ? 'BM' : 'BK';
            $date_part = date('Ymd');
            
            // Mencari nomor urut terakhir hari ini (INI HANYA CONTOH, SEBAIKNYA MENGGUNAKAN FUNGSI AUTO INCREMENT DATABASE)
            $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE transaction_code LIKE ?");
            $stmt_count->execute(["{$prefix}-{$date_part}%"]);
            $count = $stmt_count->fetchColumn() + 1;
            
            $transaction_code = "{$prefix}-{$date_part}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
            
            // 2. Cek Stok (Hanya untuk Barang Keluar / 'OUT')
            if ($type === 'OUT') {
                $stmt_stock = $pdo->prepare("SELECT current_stock FROM items WHERE id = ?");
                $stmt_stock->execute([$item_id]);
                $stock = $stmt_stock->fetchColumn();
                
                if ($quantity > $stock) {
                    api_response(false, "Jumlah barang keluar melebihi stok tersedia ({$stock} Pcs).", null, 400);
                }
                
                // Cek apakah item sudah disetujui
                $stmt_approved = $pdo->prepare("SELECT is_approved FROM items WHERE id = ?");
                $stmt_approved->execute([$item_id]);
                if (!$stmt_approved->fetchColumn()) {
                    api_response(false, "Item ini belum disetujui (APPROVED) dan tidak bisa dikeluarkan.", null, 403);
                }
            }
            
            // 3. Simpan Permintaan ke Tabel Transactions (Status PENDING)
            $supplier_id = ($type === 'IN') ? $master_id : null;
            $recipient_id = ($type === 'OUT') ? $master_id : null;
            
            $sql = "INSERT INTO transactions (transaction_code, item_id, type, quantity, note, supplier_id, recipient_id, request_by_user_id, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $transaction_code, 
                $item_id, 
                $type, 
                $quantity, 
                $note, 
                $supplier_id, 
                $recipient_id, 
                $user_id
            ]);

            api_response(true, "Permintaan {$prefix} berhasil diajukan. Status: PENDING menanti Supervisor.", ['code' => $transaction_code], 201);
            
        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in transactions.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database saat membuat transaksi.", null, 500);
}
?>