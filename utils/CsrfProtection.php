<?php
/**
 * =========================================================
 * CSRF PROTECTION MODULE
 * File: utils/CsrfProtection.php
 * Purpose: Generate & validate CSRF tokens securely
 * =========================================================
 */
class CsrfProtection {
    
    /**
     * Generate CSRF token dan simpan di session
     */
    public static function generateToken() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Generate random token (32 bytes = 64 hex characters)
        $token = bin2hex(random_bytes(32));
        
        // Simpan di session
        $_SESSION['csrf_token'] = $token;
        
        return $token;
    }
    
    /**
     * Get current CSRF token (atau generate baru jika belum ada)
     */
    public static function getToken() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token'])) {
            return self::generateToken();
        }
        
        return $_SESSION['csrf_token'];
    }
    
    /**
     * Validate CSRF token dari request
     */
    public static function validateToken($token) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token']) || empty($token)) {
            return false;
        }
        
        // Gunakan hash_equals untuk mencegah timing attack
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Get token dari request header atau POST data
     */
    public static function getTokenFromRequest() {
        $headers = getallheaders();
        // Cek Header (biasanya X-CSRF-Token)
        if (isset($headers['X-CSRF-Token'])) {
            return $headers['X-CSRF-Token'];
        }
        // Cek POST data
        if (isset($_POST['csrf_token'])) {
            return $_POST['csrf_token'];
        }
        // Cek JSON body
        $json = file_get_contents('php://input');
        if ($json) {
            $data = json_decode($json, true);
            if (isset($data['csrf_token'])) {
                return $data['csrf_token'];
            }
        }
        return null;
    }
}
?>