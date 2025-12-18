<?php
// FILE: api/suppliers.php - CLEAN & SECURE VERSION
// Fungsi: CRUD Supplier (Tanpa log file sampah)

include('../config/db_config.php'); 
include('../utils/SessionManager.php'); // Security Helper

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// 1. Wajib Login & Cek Timeout
SessionManager::requireAuth();

// 2. Role Check
SessionManager::requireRole(['admin', 'staff', 'supervisor', 'owner']);

$user = SessionManager::getUser();
$user_role = $user['role'];
$user_id = $user['id'];

// Request Handler
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        
        // GET: Ambil Supplier
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            if ($action === 'my_requests') {
                if ($user_role !== 'staff') {
                    api_response(false, "Akses hanya untuk Staff.", null, 403);
                }
                $sql = "SELECT id, name, contact_person, phone, address, is_active, created_at 
                        FROM suppliers WHERE created_by_user_id = ? ORDER BY created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id]);
                api_response(true, "Riwayat request supplier berhasil diambil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
                
            } elseif ($action === 'list') {
                $stmt = $pdo->query("SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name ASC");
                api_response(true, "Daftar supplier aktif berhasil diambil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
                
            } else {
                $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC");
                api_response(true, "Data supplier berhasil diambil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        // POST: Tambah Supplier
        case 'POST':
            if ($user_role !== 'admin' && $user_role !== 'staff') {
                api_response(false, "Anda tidak memiliki hak untuk menambahkan supplier.", null, 403);
            }

            $data = json_decode(file_get_contents("php://input"), true);
            $name = trim($data['name'] ?? '');
            $contact_person = trim($data['contact_person'] ?? '');
            $phone = trim($data['phone'] ?? '');
            $address = trim($data['address'] ?? '');

            if (empty($name)) {
                api_response(false, "Nama Supplier wajib diisi.", null, 400);
            }
            
            // Cek duplikat
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM suppliers WHERE name = ?");
            $stmt_check->execute([$name]);
            if ($stmt_check->fetchColumn() > 0) {
                api_response(false, "Supplier '{$name}' sudah terdaftar.", null, 409);
            }
            
            $is_active = ($user_role === 'admin') ? 1 : 0;
            $message = ($user_role === 'admin') 
                ? "Supplier '{$name}' berhasil ditambahkan dan langsung aktif." 
                : "Permintaan Supplier '{$name}' berhasil diajukan dan menanti approval Supervisor.";

            $sql = "INSERT INTO suppliers (name, contact_person, phone, address, is_active, created_by_user_id) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$name, $contact_person, $phone, $address, $is_active, $user_id]);
            
            api_response(true, $message, ['id' => $pdo->lastInsertId()], 201);
            break;
            
        // PUT: Edit Supplier (Hanya Admin/Supervisor)
        case 'PUT':
        case 'PATCH':
            if ($user_role !== 'admin' && $user_role !== 'supervisor') {
                api_response(false, "Hanya Admin/Supervisor yang boleh mengedit supplier.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $contact_person = $data['contact_person'] ?? '';
            $phone = $data['phone'] ?? '';
            $address = $data['address'] ?? '';
            $is_active = $data['is_active'] ?? null;

            if (!$id || empty($name)) {
                api_response(false, "ID dan Nama Supplier wajib diisi.", null, 400);
            }

            $sql = "UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, address = ?, is_active = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$name, $contact_person, $phone, $address, $is_active, $id]);

            api_response(true, "Data Supplier ID:{$id} berhasil diupdate.", null);
            break;

        // DELETE: Hapus (Hanya Admin)
        case 'DELETE':
            if ($user_role !== 'admin') {
                api_response(false, "Hanya Admin yang boleh menghapus supplier.", null, 403);
            }
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Supplier wajib diisi.", null, 400);
            }
            
            // Soft delete (Non-aktifkan)
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$id]);

            api_response(true, "Supplier ID:{$id} berhasil dinonaktifkan.", null);
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (PDOException $e) {
    error_log("DB Error in suppliers.php: " . $e->getMessage()); // Masuk ke error log server saja
    api_response(false, "Kesalahan database.", null, 500);
}
?>