<?php
// FILE: api/recipients.php
// Fungsi: API CRUD untuk Data Master Penerima Barang Keluar
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
        // READ: Mengambil daftar Penerima
        case 'GET':
            // Digunakan untuk mengisi dropdown Staff di form Barang Keluar
            $stmt = $pdo->query("SELECT id, name, type FROM recipients ORDER BY name ASC");
            $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            api_response(true, "Daftar penerima berhasil diambil.", $recipients);

        // CREATE: Menambah Penerima baru
        case 'POST':
            // Hanya Admin/Staff yang bisa menambah
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
            
        // UPDATE: Mengubah data Penerima
        case 'PUT':
        case 'PATCH':
            // Hanya Admin yang bisa mengedit
            if ($user_role !== 'admin') {
                api_response(false, "Anda tidak memiliki hak untuk mengubah data penerima.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $type = $data['type'] ?? '';
            $address = $data['address'] ?? '';

            if (!$id || empty($name) || empty($type)) {
                api_response(false, "ID, Nama, dan Tipe Penerima wajib diisi.", null, 400);
            }

            $sql = "UPDATE recipients SET name = ?, type = ?, address = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$name, $type, $address, $id]);

            api_response(true, "Data Penerima ID:{$id} berhasil diupdate.", null);

        // DELETE: Menghapus Penerima (Hard Delete jika data tidak terkait)
        case 'DELETE':
            // Hanya Admin yang bisa menghapus
            if ($user_role !== 'admin') {
                api_response(false, "Anda tidak memiliki hak untuk menghapus penerima.", null, 403);
            }
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Penerima wajib diisi untuk menghapus.", null, 400);
            }
            
            // Perhatian: Ini adalah hard delete. Jika sudah ada transaksi, akan gagal (Foreign Key Constraint)
            $stmt = $pdo->prepare("DELETE FROM recipients WHERE id = ?");
            $stmt->execute([$id]);

            api_response(true, "Penerima ID:{$id} berhasil dihapus (hard delete).", null);

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    // Tangani error database
    error_log("Database Error in recipients.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>