<?php
/**
 * =========================================================
 * SESSION MANAGER - CENTRALIZED SECURITY
 * File: utils/SessionManager.php
 * Fitur: Session Timeout, Role Check, Anti-Fixation
 * =========================================================
 */
class SessionManager {
    
    // Timeout 30 menit (1800 detik)
    const TIMEOUT_DURATION = 1800; 

    /**
     * Mulai session dengan aman
     */
    public static function start() {
        if (session_status() === PHP_SESSION_NONE) {
            // Setting cookie biar lebih aman (HttpOnly)
            ini_set('session.cookie_httponly', 1);
            session_start();
        }
    }

    /**
     * Wajib Login & Cek Timeout
     * Script MATI (exit) kalau gagal.
     */
    public static function requireAuth() {
        self::start();

        // 1. Cek Login
        if (!isset($_SESSION['user'])) {
            self::sendResponse(401, false, 'Anda belum login.');
        }

        // 2. Cek Timeout
        if (isset($_SESSION['last_activity'])) {
            $elapsed = time() - $_SESSION['last_activity'];
            if ($elapsed > self::TIMEOUT_DURATION) {
                session_unset();
                session_destroy();
                self::sendResponse(401, false, 'Sesi berakhir (Timeout). Silakan login lagi.', ['session_expired' => true]);
            }
        }

        // 3. Update Waktu
        $_SESSION['last_activity'] = time();
    }

    /**
     * Wajib Punya Role Tertentu
     * Script MATI (exit) kalau role tidak cocok.
     */
    public static function requireRole($allowedRoles) {
        self::start();
        
        $myRole = $_SESSION['user']['role'] ?? '';
        
        // Convert string ke array kalau cuma satu role
        if (!is_array($allowedRoles)) {
            $allowedRoles = [$allowedRoles];
        }

        if (!in_array($myRole, $allowedRoles)) {
            self::sendResponse(403, false, "Akses Ditolak. Role Anda ($myRole) tidak diizinkan.");
        }
    }

    /**
     * Ambil data user saat ini
     */
    public static function getUser() {
        self::start();
        return $_SESSION['user'] ?? null;
    }

    /**
     * Helper response JSON & Exit
     */
    private static function sendResponse($code, $success, $message, $extra = []) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
        exit();
    }
}
?>