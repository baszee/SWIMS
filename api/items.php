<?php
// FILE: api/items.php
// Fungsi: API CRUD untuk Data Master Barang/Item dan Stok
session_start();
// Pastikan path sudah diubah menjadi '../config/db_config.php'
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
$allowed_roles = ['admin', 'staff', 'supervisor', 'owner'];

if (!in_array($user_role, $allowed_roles)) {
    api_response(false, "Otorisasi ditolak.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar Item
        case 'GET':
            // Jika ada query 'available', hanya tampilkan item yang sudah diapprove
            if (isset($_GET['action']) && $_GET['action'] === 'available') {
                $stmt = $pdo->query("
                    SELECT i.id, i.sku, i.name, i.unit, i.current_stock, s.name as supplier_name 
                    FROM items i JOIN suppliers s ON i.supplier_id = s.id 
                    WHERE i.is_approved = TRUE 
                    ORDER BY i.name ASC
                ");
            } else {
                // Tampilkan semua data item untuk manajemen atau laporan
                $stmt = $pdo->query("
                    SELECT i.*, s.name as supplier_name, u.username as created_by 
                    FROM items i 
                    JOIN suppliers s ON i.supplier_id = s.id 
                    JOIN users u ON i.created_by_user_id = u.id 
                    ORDER BY i.name ASC
                ");
            }
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            api_response(true, "Daftar item berhasil diambil.", $items);

        // CREATE: Menambah Item baru (Digunakan oleh Admin (APPROVED) atau Staff (PENDING))
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $sku = trim($data['sku'] ?? '');
            $name = trim($data['name'] ?? '');
            $unit = $data['unit'] ?? 'Pcs';
            $supplier_id = $data['supplier_id'] ?? null;
            $min_stock = $data['min_stock'] ?? 10;
            $current_stock = $data['current_stock'] ?? 0; // Stok awal

            if (empty($sku) || empty($name) || !$supplier_id) {
                api_response(false, "SKU, Nama Item, dan Supplier wajib diisi.", null, 400);
            }
            
            // Logika Persetujuan Otomatis:
            // Jika Admin yang membuat, langsung APPROVED (TRUE).
            // Jika Staff yang membuat (melalui Request Item), statusnya PENDING (FALSE).
            $is_approved_status = ($user_role === 'admin') ? TRUE : FALSE;
            $response_message = ($user_role === 'admin') ? "Item '{$name}' berhasil ditambahkan dan langsung disetujui." : "Permintaan Item '{$name}' berhasil diajukan dan menanti persetujuan Supervisor.";


            $stmt = $pdo->prepare("INSERT INTO items (sku, name, unit, supplier_id, min_stock, current_stock, is_approved, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$sku, $name, $unit, $supplier_id, $min_stock, $current_stock, $is_approved_status, $user_id]);

            api_response(true, $response_message, ['id' => $pdo->lastInsertId()], 201);
            
        // UPDATE: Mengubah data Item
        case 'PUT':
        case 'PATCH':
            if ($user_role !== 'admin' && $user_role !== 'supervisor') {
                api_response(false, "Anda tidak memiliki hak untuk mengubah data item.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $min_stock = $data['min_stock'] ?? 10;
            $is_approved = $data['is_approved'] ?? null; // Digunakan untuk fungsi Approval Item

            if (!$id) {
                api_response(false, "ID Item wajib diisi.", null, 400);
            }

            // Hanya update field yang relevan untuk manajemen
            $sql = "UPDATE items SET name = ?, min_stock = ?";
            $params = [$name, $min_stock];
            
            if ($is_approved !== null) {
                // Hanya Admin atau Supervisor yang boleh mengubah status approval
                if ($user_role !== 'admin' && $user_role !== 'supervisor') {
                    api_response(false, "Anda tidak memiliki hak untuk mengubah status approval.", null, 403);
                }
                $sql .= ", is_approved = ?";
                $params[] = $is_approved;
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            api_response(true, "Data Item ID:{$id} berhasil diupdate.", null);

        // DELETE: Item tidak dihapus, hanya di-deactivate (jika ada kebutuhan)
        case 'DELETE':
            api_response(false, "Penghapusan item tidak diizinkan. Silakan gunakan fungsi manajemen untuk mengatur is_approved atau status lain.", null, 405);
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in items.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>