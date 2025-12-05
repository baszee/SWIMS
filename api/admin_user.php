<?php
// FILE: api/admin_users.php
// Fungsi: API CRUD untuk Manajemen User oleh Administrator
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

if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    api_response(false, "Akses ditolak. Hanya Administrator yang diizinkan.", null, 403);
}

$user_id = $_SESSION['user']['id'];

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar User
        case 'GET':
            $stmt = $pdo->query("SELECT id, username, role, is_active, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            api_response(true, "Daftar pengguna berhasil diambil.", $users);

        // CREATE: Menambah User baru
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $username = trim($data['username'] ?? '');
            $password = $data['password'] ?? '123456'; // Default password jika kosong
            $role = $data['role'] ?? null;

            if (empty($username) || empty($role)) {
                api_response(false, "Username dan Role wajib diisi.", null, 400);
            }
            
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // Cek apakah username sudah ada
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $stmt_check->execute([$username]);
            if ($stmt_check->fetchColumn() > 0) {
                api_response(false, "Username '{$username}' sudah digunakan.", null, 409);
            }

            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashed_password, $role]);

            api_response(true, "User '{$username}' dengan role {$role} berhasil ditambahkan.", ['id' => $pdo->lastInsertId()], 201);
            
        // UPDATE: Mengubah data User (Role dan Status Aktif)
        case 'PUT':
        case 'PATCH':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $role = $data['role'] ?? null;
            $is_active = $data['is_active'] ?? null;
            $new_password = $data['new_password'] ?? null;

            if (!$id) {
                api_response(false, "ID User wajib diisi.", null, 400);
            }

            $sql = "UPDATE users SET role = ?, is_active = ?";
            $params = [$role, $is_active];

            // Tambahkan update password jika diisi
            if (!empty($new_password)) {
                $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
                $sql .= ", password = ?";
                $params[] = $hashed_password;
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            api_response(true, "Data User ID:{$id} berhasil diupdate.", null);

        // DELETE: Deactivate User
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID User wajib diisi.", null, 400);
            }
            
            // Pencegahan: Admin tidak bisa menonaktifkan dirinya sendiri
            if ((int)$id === (int)$user_id) {
                 api_response(false, "Anda tidak dapat menonaktifkan akun Anda sendiri.", null, 403);
            }
            
            // Deactivate user (set is_active = FALSE)
            $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$id]);

            api_response(true, "User ID:{$id} berhasil di-nonaktifkan.", null);

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in admin_users.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>