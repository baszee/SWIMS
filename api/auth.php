<?php
/**
 * =========================================================
 * FILE: api/auth.php - Enhanced with Activity Logging
 * Purpose: Authentication with complete audit trail
 * =========================================================
 */

session_start();
include('../config/db_config.php');
include('../utils/ActivityLogger.php');

header('Content-Type: application/json');

// Initialize logger
$logger = new ActivityLogger($pdo);

// ========================================
// POST: LOGIN
// ========================================
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
        // Get user from database
        $stmt = $pdo->prepare("SELECT id, username, password, role, is_active FROM users WHERE username = ? AND role = ?");
        $stmt->execute([$username, $role_request]);
        $user = $stmt->fetch();

        if ($user) {
            // Check if user is active
            if ($user['is_active'] == 0) {
                // Log failed login attempt (inactive account)
                $logger->log(
                    $user['id'],
                    $user['username'],
                    'LOGIN_FAILED',
                    "Login failed: Account is inactive",
                    ['reason' => 'inactive_account', 'role' => $role_request]
                );
                
                echo json_encode(['success' => false, 'message' => 'Akun Anda telah dinonaktifkan.']);
                exit;
            }
            
            // Verify password
            if (password_verify($password, $user['password'])) {
                // ✅ LOGIN SUCCESS
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'logged_at' => date('Y-m-d H:i:s')
                ];

                // Log successful login
                $logger->log(
                    $user['id'],
                    $user['username'],
                    'LOGIN',
                    "User logged in as {$user['role']}",
                    [
                        'role' => $user['role'],
                        'login_time' => date('Y-m-d H:i:s'),
                        'session_id' => session_id()
                    ]
                );

                echo json_encode([
                    'success' => true, 
                    'message' => 'Login berhasil!', 
                    'role' => $user['role']
                ]);
                
            } else {
                // ❌ WRONG PASSWORD
                $logger->log(
                    $user['id'],
                    $user['username'],
                    'LOGIN_FAILED',
                    "Login failed: Incorrect password",
                    ['reason' => 'wrong_password', 'role' => $role_request]
                );
                
                echo json_encode(['success' => false, 'message' => 'Password salah untuk role ini.']);
            }
        } else {
            // ❌ USER NOT FOUND
            // Note: We don't have user_id here, so log with special ID
            $logger->log(
                0, // Special ID for unknown users
                $username,
                'LOGIN_FAILED',
                "Login failed: User not found with role {$role_request}",
                ['reason' => 'user_not_found', 'role' => $role_request]
            );
            
            echo json_encode(['success' => false, 'message' => 'User tidak ditemukan dengan role tersebut.']);
        }
        
    } catch (\PDOException $e) {
        error_log("Database Error in login: " . $e->getMessage());
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Kesalahan server. Koneksi database gagal.']));
    }
}

// ========================================
// GET: CHECK SESSION & LOGOUT
// ========================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'check_session') {
        // Check login status
        if (isset($_SESSION['user'])) {
            echo json_encode(['logged_in' => true, 'user' => $_SESSION['user']]);
        } else {
            echo json_encode(['logged_in' => false, 'user' => null]);
        }
        
    } else if ($action === 'logout') {
        // Log logout before destroying session
        if (isset($_SESSION['user'])) {
            $logger->log(
                $_SESSION['user']['id'],
                $_SESSION['user']['username'],
                'LOGOUT',
                "User logged out",
                [
                    'role' => $_SESSION['user']['role'],
                    'logout_time' => date('Y-m-d H:i:s'),
                    'session_duration' => 'calculated_if_needed'
                ]
            );
        }
        
        // Destroy session
        unset($_SESSION['user']);
        session_destroy();
        
        echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
    }
}
?>