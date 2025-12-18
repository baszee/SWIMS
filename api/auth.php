<?php
/**
 * =========================================================
 * FILE: api/auth.php - ULTIMATE SECURE VERSION (v5.1 - Auto Role)
 * Features:
 * - Activity Logging (Full Detail)
 * - Session Timeout (30 min)
 * - Database Rate Limiting (IP Based - Anti Brute Force)
 * - Anti-Session Fixation
 * - CSRF Token Generation
 * - Auto Role Detection (No user input required)
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
// 1. SESSION TIMEOUT CHECK
// ========================================
if (isset($_SESSION['last_activity'])) {
    $elapsed = time() - $_SESSION['last_activity'];
    if ($elapsed > 1800) { // 30 menit
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
// 2. DATABASE RATE LIMITING FUNCTIONS (IP BASED)
// ========================================
function checkRateLimit($pdo, $ip) {
    // Hapus log lama (opsional: reset setelah 1 hari)
    // $pdo->query("DELETE FROM login_attempts WHERE locked_until < NOW() - INTERVAL 1 DAY");

    $stmt = $pdo->prepare("SELECT * FROM login_attempts WHERE ip_address = ?");
    $stmt->execute([$ip]);
    $attempt = $stmt->fetch();

    if ($attempt) {
        // Cek apakah sedang terkunci
        if ($attempt['locked_until'] && new DateTime($attempt['locked_until']) > new DateTime()) {
            return false; // TERKUNCI
        }
        // Reset otomatis jika waktu kunci sudah lewat
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
            // Kunci IP selama 15 menit
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

// Cek IP Client
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// ========================================
// POST: LOGIN
// ========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // 🛡️ CEK RATE LIMIT SEBELUM PROSES
    if (!checkRateLimit($pdo, $clientIP)) {
        http_response_code(429);
        $logger->log(0, 'Unknown', 'LOGIN_BLOCKED', "IP $clientIP blocked due to too many attempts");
        exit(json_encode([
            'success' => false, 
            'message' => 'Terlalu banyak percobaan gagal. IP Anda diblokir sementara (15 menit).'
        ]));
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    // NOTE: Role tidak lagi diambil dari input user

    if (empty($username) || empty($password)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Username dan Password wajib diisi.']));
    }

    try {
        // Cek User (Query hanya berdasarkan Username)
        $stmt = $pdo->prepare("SELECT id, username, password, role, is_active FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user) {
            // Cek Aktif
            if ($user['is_active'] == 0) {
                $logger->log($user['id'], $user['username'], 'LOGIN_FAILED', "Account inactive (Role: {$user['role']})");
                echo json_encode(['success' => false, 'message' => 'Akun Anda telah dinonaktifkan.']);
                exit;
            }
            
            // Verifikasi Password
            if (password_verify($password, $user['password'])) {
                
                // ✅ 1. Anti Session Fixation
                session_regenerate_id(true);

                // ✅ 2. Reset Rate Limit (Hapus dari DB karena sukses)
                resetLoginAttempts($pdo, $clientIP);

                // ✅ 3. Generate CSRF Token
                if (empty($_SESSION['csrf_token'])) {
                    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
                }

                // Set Session
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'], // Role diambil dari Database
                    'logged_at' => date('Y-m-d H:i:s')
                ];
                $_SESSION['last_activity'] = time();

                // Log Sukses
                $logger->log($user['id'], $user['username'], 'LOGIN', "Logged in as {$user['role']}", ['session_id' => session_id()]);

                // Kirim response sukses beserta role untuk frontend redirect
                echo json_encode(['success' => true, 'message' => 'Login berhasil!', 'role' => $user['role']]);
                
            } else {
                // ❌ Salah Password
                recordFailedLogin($pdo, $clientIP); // Catat ke DB
                
                $logger->log($user['id'], $user['username'], 'LOGIN_FAILED', "Wrong password");
                echo json_encode(['success' => false, 'message' => 'Password salah.']);
            }
        } else {
            // ❌ User Tidak Ditemukan
            recordFailedLogin($pdo, $clientIP); // Catat ke DB
            
            $logger->log(0, $username, 'LOGIN_FAILED', "User not found");
            echo json_encode(['success' => false, 'message' => 'Username atau Password salah.']);
        }
        
    } catch (\PDOException $e) {
        error_log("Login DB Error: " . $e->getMessage());
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
            // Update last activity
            $_SESSION['last_activity'] = time();
            
            echo json_encode([
                'logged_in' => true, 
                'user' => $_SESSION['user'],
                'csrf_token' => $_SESSION['csrf_token'] ?? null 
            ]);
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