<?php
// FILE: api/recipients.php - SECURE VERSION
// Fungsi: CRUD Penerima Barang

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

// Request Handler
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        
        // GET: List Penerima
        case 'GET':
            $stmt = $pdo->query("SELECT id, name, type FROM recipients ORDER BY name ASC");
            api_response(true, "Daftar penerima berhasil diambil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        // POST: Tambah Penerima (Admin & Staff)
        case 'POST':
            if ($user_role !== 'admin' && $user_role !== 'staff') {
                api_response(false, "Anda tidak memiliki hak untuk menambahkan penerima.", null, 403);
            }

            $data = json_decode(file_get_contents("php://input"), true);
            $name = trim($data['name'] ?? '');
            $type = $data['type'] ?? 'Individual';
            $address = $data['address'] ?? '';

            if (empty($name) || empty($type)) {
                api_response(false, "Nama dan Tipe Penerima wajib diisi.", null, 400);
            }

            $stmt = $pdo->prepare("INSERT INTO recipients (name, type, address) VALUES (?, ?, ?)");
            $stmt->execute([$name, $type, $address]);

            api_response(true, "Penerima '{$name}' berhasil ditambahkan.", ['id' => $pdo->lastInsertId()], 201);
            break;
            
        // PUT: Edit (Hanya Admin)
        case 'PUT':
        case 'PATCH':
            if ($user_role !== 'admin') {
                api_response(false, "Hanya Admin yang boleh mengedit data penerima.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $type = $data['type'] ?? '';
            $address = $data['address'] ?? '';

            if (!$id || empty($name) || empty($type)) {
                api_response(false, "ID, Nama, dan Tipe wajib diisi.", null, 400);
            }

            $stmt = $pdo->prepare("UPDATE recipients SET name = ?, type = ?, address = ? WHERE id = ?");
            $stmt->execute([$name, $type, $address, $id]);

            api_response(true, "Data Penerima ID:{$id} berhasil diupdate.", null);
            break;

        // DELETE: Hapus (Hanya Admin)
        case 'DELETE':
            if ($user_role !== 'admin') {
                api_response(false, "Hanya Admin yang boleh menghapus penerima.", null, 403);
            }
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Penerima wajib diisi.", null, 400);
            }
            
            // Hard delete
            try {
                $stmt = $pdo->prepare("DELETE FROM recipients WHERE id = ?");
                $stmt->execute([$id]);
                api_response(true, "Penerima ID:{$id} berhasil dihapus.", null);
            } catch (PDOException $e) {
                api_response(false, "Gagal menghapus: Data mungkin sedang digunakan dalam transaksi.", null, 409);
            }
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (PDOException $e) {
    error_log("DB Error in recipients.php: " . $e->getMessage());
    api_response(false, "Kesalahan database.", null, 500);
}
?>