<?php
/**
 * =========================================================
 * FILE: api/auth.php - FINAL SECURE VERSION (v4.0)
 * Features:
 * - Activity Logging (Preserved)
 * - Session Timeout (30 minutes)
 * - IP-Based Rate Limiting (Database Backed) 🔥
 * - Anti-Session Fixation (Regenerate ID) 🔥
 * =========================================================
 */

session_start();
include('../config/db_config.php');
include('../config/security_config.php');
include('../utils/ActivityLogger.php');

header('Content-Type: application/json');

// Initialize logger
$logger = new ActivityLogger($pdo);

// ========================================
// 1. SESSION TIMEOUT CHECK (30 minutes)
// ========================================
if (isset($_SESSION['last_activity'])) {
    $elapsed = time() - $_SESSION['last_activity'];
    if ($elapsed > 1800) { // 30 minutes
        $logger->log(
            $_SESSION['user']['id'] ?? 0,
            $_SESSION['user']['username'] ?? 'Unknown',
            'LOGOUT',
            'Session expired (timeout)',
            ['elapsed_seconds' => $elapsed]
        );
        
        session_unset();
        session_destroy();
        http_response_code(401);
        exit(json_encode([
            'success' => false, 
            'message' => 'Session expired. Silakan login kembali.',
            'session_expired' => true
        ]));
    }
}
$_SESSION['last_activity'] = time();

// ========================================
// 2. DATABASE RATE LIMITING (IP BASED) 🔥
// ========================================
function checkRateLimit($pdo, $ip) {
    // Bersihkan log lama (opsional, biar tabel gak penuh)
    // $pdo->query("DELETE FROM login_attempts WHERE locked_until < NOW() - INTERVAL 1 DAY");

    $stmt = $pdo->prepare("SELECT * FROM login_attempts WHERE ip_address = ?");
    $stmt->execute([$ip]);
    $attempt = $stmt->fetch();

    if ($attempt) {
        // Cek apakah sedang terkunci
        if ($attempt['locked_until'] && new DateTime($attempt['locked_until']) > new DateTime()) {
            return false; // TERKUNCI
        }
        // Reset jika waktu kunci sudah lewat
        if ($attempt['locked_until'] && new DateTime($attempt['locked_until']) <= new DateTime()) {
            $pdo->prepare("UPDATE login_attempts SET attempts = 0, locked_until = NULL WHERE ip_address = ?")->execute([$ip]);
            return true;
        }
    }
    return true; // Aman
}

function recordFailedLogin($pdo, $ip) {
    $stmt = $pdo->prepare("SELECT * FROM login_attempts WHERE ip_address = ?");
    $stmt->execute([$ip]);
    $attempt = $stmt->fetch();

    if ($attempt) {
        $newAttempts = $attempt['attempts'] + 1;
        if ($newAttempts >= 5) {
            // Kunci selama 15 menit
            $lockedUntil = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $pdo->prepare("UPDATE login_attempts SET attempts = ?, last_attempt = NOW(), locked_until = ? WHERE ip_address = ?")
                ->execute([$newAttempts, $lockedUntil, $ip]);
        } else {
            $pdo->prepare("UPDATE login_attempts SET attempts = ?, last_attempt = NOW() WHERE ip_address = ?")
                ->execute([$newAttempts, $ip]);
        }
    } else {
        $pdo->prepare("INSERT INTO login_attempts (ip_address, attempts, last_attempt) VALUES (?, 1, NOW())")
            ->execute([$ip]);
    }
}

function resetLoginAttempts($pdo, $ip) {
    $pdo->prepare("DELETE FROM login_attempts WHERE ip_address = ?")->execute([$ip]);
}

// Cek Rate Limit Sebelum Proses Login
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!checkRateLimit($pdo, $clientIP)) {
        http_response_code(429); // Too Many Requests
        exit(json_encode([
            'success' => false, 
            'message' => 'Terlalu banyak percobaan gagal. IP Anda diblokir sementara selama 15 menit.'
        ]));
    }
}

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
                $logger->log($user['id'], $user['username'], 'LOGIN_FAILED', "Login failed: Account inactive", ['role' => $role_request]);
                echo json_encode(['success' => false, 'message' => 'Akun Anda telah dinonaktifkan.']);
                exit;
            }
            
            // Verify password
            if (password_verify($password, $user['password'])) {
                
                // 🔥 SECURITY FIX 1: Session Fixation
                session_regenerate_id(true);

                // 🔥 SECURITY FIX 2: Reset Rate Limit jika sukses
                resetLoginAttempts($pdo, $clientIP);

                // ✅ LOGIN SUCCESS
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'logged_at' => date('Y-m-d H:i:s')
                ];
                $_SESSION['last_activity'] = time();

                $logger->log($user['id'], $user['username'], 'LOGIN', "User logged in as {$user['role']}", ['session_id' => session_id()]);

                echo json_encode(['success' => true, 'message' => 'Login berhasil!', 'role' => $user['role']]);
                
            } else {
                // ❌ WRONG PASSWORD
                recordFailedLogin($pdo, $clientIP); // Catat kegagalan ke DB
                
                $logger->log($user['id'], $user['username'], 'LOGIN_FAILED', "Wrong password", ['role' => $role_request]);
                echo json_encode(['success' => false, 'message' => 'Password salah.']);
            }
        } else {
            // ❌ USER NOT FOUND
            recordFailedLogin($pdo, $clientIP); // Catat kegagalan ke DB
            
            $logger->log(0, $username, 'LOGIN_FAILED', "User not found", ['role' => $role_request]);
            echo json_encode(['success' => false, 'message' => 'User tidak ditemukan.']);
        }
        
    } catch (\PDOException $e) {
        error_log("DB Error: " . $e->getMessage());
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Server Error.']));
    }
}

// ========================================
// GET: CHECK SESSION & LOGOUT
// ========================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'check_session') {
        if (isset($_SESSION['user'])) {
            echo json_encode(['logged_in' => true, 'user' => $_SESSION['user']]);
        } else {
            echo json_encode(['logged_in' => false, 'user' => null]);
        }
        
    } else if ($action === 'logout') {
        if (isset($_SESSION['user'])) {
            $logger->log($_SESSION['user']['id'], $_SESSION['user']['username'], 'LOGOUT', "User logged out");
        }
        session_unset();
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
    }
}
?>