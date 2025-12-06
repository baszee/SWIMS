<?php
// FILE: api/transactions.php - FIXED VERSION
// Fungsi: Menerima permintaan Barang Masuk (IN) atau Barang Keluar (OUT) dari Staff
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
                    LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
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
            
            if (empty($type) || !in_array($type, ['IN', 'OUT']) || $quantity <= 0) {
                api_response(false, "Data input tidak lengkap atau tidak valid.", null, 400);
            }
            
            // Generate Transaction Code
            $prefix = ($type === 'IN') ? 'BM' : 'BK';
            $date_part = date('Ymd');
            $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE transaction_code LIKE ?");
            $stmt_count->execute(["{$prefix}-{$date_part}%"]);
            $count = $stmt_count->fetchColumn() + 1;
            $transaction_code = "{$prefix}-{$date_part}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
            
            
            // =====================================================================
            // A. BARANG MASUK (IN) - FIXED LOGIC
            // =====================================================================
            if ($type === 'IN') {
                $supplier_id = $data['supplier_id'] ?? null;
                $sku = trim($data['sku'] ?? '');
                $name = trim($data['name'] ?? '');
                $unit = $data['unit'] ?? 'Pcs';
                
                if (!$supplier_id) {
                    api_response(false, "Supplier wajib dipilih untuk Barang Masuk.", null, 400);
                }
                
                // Validasi Supplier
                $stmt_supplier = $pdo->prepare("SELECT is_active FROM suppliers WHERE id = ?");
                $stmt_supplier->execute([$supplier_id]);
                $supplier = $stmt_supplier->fetch();
                
                if (!$supplier || !$supplier['is_active']) {
                    api_response(false, "Supplier tidak ditemukan atau masih PENDING approval.", null, 403);
                }
                
                // CASE 1: Item sudah ada (item_id dikirim)
                if ($item_id) {
                    $stmt_item = $pdo->prepare("SELECT is_approved, supplier_id, current_stock, name FROM items WHERE id = ?");
                    $stmt_item->execute([$item_id]);
                    $item = $stmt_item->fetch();
                    
                    if (!$item) {
                        api_response(false, "Item tidak ditemukan.", null, 404);
                    }
                    
                    if (!$item['is_approved']) {
                        api_response(false, "Item masih PENDING approval. Tunggu Supervisor menyetujui.", null, 403);
                    }
                    
                    if ($item['supplier_id'] != $supplier_id) {
                        api_response(false, "Item tidak sesuai dengan Supplier yang dipilih.", null, 400);
                    }
                    
                    // Buat transaksi
                    $sql = "INSERT INTO transactions 
                            (transaction_code, item_id, type, quantity, note, supplier_id, request_by_user_id, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$transaction_code, $item_id, $type, $quantity, $note, $supplier_id, $user_id]);
                    
                    api_response(true, "Permintaan Barang Masuk berhasil diajukan. Kode: {$transaction_code}. Status: PENDING.", ['code' => $transaction_code], 201);
                }
                // CASE 2: Item baru (sku dan name dikirim)
                else {
                    if (empty($sku) || empty($name)) {
                        api_response(false, "SKU dan Nama Item wajib diisi untuk item baru.", null, 400);
                    }
                    
                    // Cek duplikat SKU
                    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM items WHERE sku = ?");
                    $stmt_check->execute([$sku]);
                    if ($stmt_check->fetchColumn() > 0) {
                        api_response(false, "SKU '{$sku}' sudah terdaftar. Gunakan SKU yang berbeda.", null, 409);
                    }
                    
                    // START TRANSACTION
                    $pdo->beginTransaction();
                    
                    try {
                        // 1. Insert Item baru dengan is_approved = FALSE (PENDING)
                        $stmt_item = $pdo->prepare("
                            INSERT INTO items 
                            (sku, name, unit, supplier_id, min_stock, current_stock, is_approved, created_by_user_id) 
                            VALUES (?, ?, ?, ?, 10, 0, FALSE, ?)
                        ");
                        $stmt_item->execute([$sku, $name, $unit, $supplier_id, $user_id]);
                        $new_item_id = $pdo->lastInsertId();
                        
                        // 2. Insert Transaksi dengan status PENDING
                        $stmt_trans = $pdo->prepare("
                            INSERT INTO transactions 
                            (transaction_code, item_id, type, quantity, note, supplier_id, request_by_user_id, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
                        ");
                        $stmt_trans->execute([$transaction_code, $new_item_id, $type, $quantity, $note, $supplier_id, $user_id]);
                        
                        $pdo->commit();
                        
                        api_response(true, 
                            "Item baru '{$name}' berhasil didaftarkan dan permintaan Barang Masuk dibuat. " .
                            "Status: PENDING - Menunggu Supervisor menyetujui Item dan Transaksi. " .
                            "Kode Transaksi: {$transaction_code}", 
                            ['code' => $transaction_code, 'item_id' => $new_item_id], 
                            201
                        );
                        
                    } catch (Exception $e) {
                        $pdo->rollBack();
                        error_log("Transaction failed: " . $e->getMessage());
                        api_response(false, "Gagal membuat item dan transaksi: " . $e->getMessage(), null, 500);
                    }
                }
            }
            
            // =====================================================================
            // B. BARANG KELUAR (OUT)
            // =====================================================================
            elseif ($type === 'OUT') {
                $recipient_name = trim($data['recipient_name'] ?? '');
                $recipient_address = trim($data['recipient_address'] ?? '');
                
                if (!$item_id) {
                    api_response(false, "Item wajib dipilih untuk Barang Keluar.", null, 400);
                }
                
                if (empty($recipient_name) || empty($recipient_address)) {
                    api_response(false, "Nama dan Alamat Penerima wajib diisi untuk Barang Keluar.", null, 400);
                }
                
                // Validasi item
                $stmt_item = $pdo->prepare("SELECT is_approved, current_stock, name FROM items WHERE id = ?");
                $stmt_item->execute([$item_id]);
                $item = $stmt_item->fetch();
                
                if (!$item || !$item['is_approved']) {
                    api_response(false, "Item tidak ditemukan atau belum disetujui.", null, 403);
                }
                
                if ($quantity > $item['current_stock']) {
                    api_response(false, "Jumlah barang keluar ({$quantity}) melebihi stok tersedia ({$item['current_stock']}).", null, 400);
                }
                
                $sql = "INSERT INTO transactions 
                        (transaction_code, item_id, type, quantity, note, recipient_name, recipient_address, request_by_user_id, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$transaction_code, $item_id, $type, $quantity, $note, $recipient_name, $recipient_address, $user_id]);
                
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