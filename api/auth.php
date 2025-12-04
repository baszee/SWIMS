<?php
// FILE: api/auth.php
// Fungsi: Menangani semua proses autentikasi (Login, Logout, Cek Session)
session_start();
include('../includes/db_config.php'); // Pastikan path ini benar!

header('Content-Type: application/json');

// Menangani Request Login (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    $role_request = $data['role'] ?? ''; 

    if (empty($username) || empty($password) || empty($role_request)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Semua kolom wajib diisi.']));
    }

    try {
        // Mencegah SQL Injection: Hanya ambil user yang cocok dengan username DAN role
        $stmt = $pdo->prepare("SELECT id, username, password, role FROM users WHERE username = ? AND role = ?");
        $stmt->execute([$username, $role_request]);
        $user = $stmt->fetch();

        if ($user) {
            // KEAMANAN TINGGI: Verifikasi Password dengan Hash yang tersimpan di DB
            // Password default di DB: 123456
            if (password_verify($password, $user['password'])) {
                
                // Login Sukses: Simpan data user ke PHP SESSION
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'logged_at' => date('Y-m-d H:i:s')
                ];

                echo json_encode(['success' => true, 'message' => 'Login berhasil!', 'role' => $user['role']]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Password salah untuk role ini.']);
            }
        } else {
             echo json_encode(['success' => false, 'message' => 'User tidak ditemukan dengan role tersebut.']);
        }
    } catch (\PDOException $e) {
        // Jangan tampilkan detail error database ke publik
        error_log("Database Error in login: " . $e->getMessage());
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Kesalahan server.']));
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'check_session') {
        // Cek status login
        if (isset($_SESSION['user'])) {
            echo json_encode(['logged_in' => true, 'user' => $_SESSION['user']]);
        } else {
            echo json_encode(['logged_in' => false, 'user' => null]);
        }
    } else if ($action === 'logout') {
        // Logout
        unset($_SESSION['user']);
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
    }
}
?>