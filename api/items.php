<?php
// FILE: api/items.php
// Fungsi: API CRUD untuk Data Master Barang/Item dan Stok
// Version: 3.0 - SECURE (Using SessionManager for Timeout & RBAC)

include('../config/db_config.php'); 
include('../utils/SessionManager.php'); // Panggil helper keamanan

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// KEAMANAN: Memeriksa Session, Timeout, dan Role via SessionManager
// ----------------------------------------------------------------------

// 1. Wajib Login & Cek Timeout
SessionManager::requireAuth();

// 2. Wajib Punya Role Tertentu (Semua user boleh lihat, tapi write terbatas)
SessionManager::requireRole(['admin', 'staff', 'supervisor', 'owner']);

// Ambil data user dari SessionManager
$user = SessionManager::getUser();
$user_role = $user['role'];
$user_id = $user['id'];

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar Item
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            
            // =====================================================================
            // ENDPOINT: SEARCH ITEM (action=search)
            // =====================================================================
            if ($action === 'search') {
                $supplier_id = $_GET['supplier_id'] ?? null;
                $query = trim($_GET['q'] ?? '');
                
                if (!$supplier_id) {
                    api_response(false, "Supplier ID wajib diisi untuk search.", null, 400);
                }
                
                // Query hanya mengambil item yang APPROVED dan sesuai Supplier
                $sql = "
                    SELECT i.id, i.sku, i.name, i.unit, i.current_stock, s.name as supplier_name
                    FROM items i 
                    JOIN suppliers s ON i.supplier_id = s.id 
                    WHERE i.supplier_id = ? AND i.is_approved = TRUE
                ";
                
                $params = [$supplier_id];
                
                if (!empty($query)) {
                    $sql .= " AND (i.sku LIKE ? OR i.name LIKE ?)";
                    $search_term = "%{$query}%";
                    $params[] = $search_term;
                    $params[] = $search_term;
                }
                
                $sql .= " ORDER BY i.name ASC LIMIT 10";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                api_response(true, "Hasil pencarian item.", $items);
            }
            
            // =====================================================================
            // ENDPOINT: AVAILABLE ITEMS (action=available) - STRICT APPROVED ONLY
            // =====================================================================
            elseif ($action === 'available') {
                $sql = "
                    SELECT i.id, i.sku, i.name, i.unit, i.current_stock, i.supplier_id,
                           i.min_stock, i.is_approved, s.name as supplier_name, i.created_at
                    FROM items i 
                    JOIN suppliers s ON i.supplier_id = s.id 
                    WHERE i.is_approved = TRUE
                    ORDER BY i.created_at DESC, i.name ASC
                ";
    
                $stmt = $pdo->query($sql);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
                api_response(true, "Daftar item approved berhasil diambil.", $items);
            }
            
            // =====================================================================
            // ENDPOINT: LIST ALL (Default)
            // =====================================================================
            else {
                $stmt = $pdo->query("
                    SELECT i.*, s.name as supplier_name, u.username as created_by 
                    FROM items i 
                    JOIN suppliers s ON i.supplier_id = s.id 
                    JOIN users u ON i.created_by_user_id = u.id 
                    ORDER BY i.created_at DESC, i.name ASC
                ");
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar semua item berhasil diambil.", $items);
            }
            break;

        // CREATE: Menambah Item baru
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $sku = trim($data['sku'] ?? '');
            $name = trim($data['name'] ?? '');
            $unit = $data['unit'] ?? 'Pcs';
            $supplier_id = $data['supplier_id'] ?? null;
            $min_stock = $data['min_stock'] ?? 10;
            $current_stock = $data['current_stock'] ?? 0;

            if (empty($sku) || empty($name) || !$supplier_id) {
                api_response(false, "SKU, Nama Item, dan Supplier wajib diisi.", null, 400);
            }
            
            // Cek duplikat SKU
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM items WHERE sku = ?");
            $stmt_check->execute([$sku]);
            if ($stmt_check->fetchColumn() > 0) {
                api_response(false, "SKU '{$sku}' sudah terdaftar.", null, 409);
            }
            
            // Logika Persetujuan: Admin langsung APPROVED, Staff PENDING
            $is_approved_status = ($user_role === 'admin') ? TRUE : FALSE;
            $response_message = ($user_role === 'admin') 
                ? "Item '{$name}' berhasil ditambahkan dan langsung disetujui." 
                : "Permintaan Item '{$name}' berhasil diajukan dan menanti persetujuan Supervisor.";

            $stmt = $pdo->prepare("INSERT INTO items (sku, name, unit, supplier_id, min_stock, current_stock, is_approved, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$sku, $name, $unit, $supplier_id, $min_stock, $current_stock, $is_approved_status, $user_id]);

            api_response(true, $response_message, ['id' => $pdo->lastInsertId()], 201);
            break;
            
        // UPDATE: Mengubah data Item
        case 'PUT':
        case 'PATCH':
            // RBAC Check: Hanya Admin & Supervisor yang boleh edit
            if ($user_role !== 'admin' && $user_role !== 'supervisor') {
                api_response(false, "Anda tidak memiliki hak untuk mengubah data item.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $min_stock = $data['min_stock'] ?? 10;
            $is_approved = $data['is_approved'] ?? null;

            if (!$id) {
                api_response(false, "ID Item wajib diisi.", null, 400);
            }

            $sql = "UPDATE items SET name = ?, min_stock = ?";
            $params = [$name, $min_stock];
            
            if ($is_approved !== null) {
                // RBAC Check: Hanya Admin & Supervisor yang boleh approve
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
            break;

        // DELETE: Item tidak dihapus
        case 'DELETE':
            api_response(false, "Penghapusan item tidak diizinkan.", null, 405);
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in items.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>