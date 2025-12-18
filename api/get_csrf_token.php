<?php
/**
 * =========================================================
 * GET CSRF TOKEN ENDPOINT - FIXED (Public Access)
 * File: api/get_csrf_token.php
 * =========================================================
 */
session_start(); // Start session untuk guest/user
include('../utils/CsrfProtection.php');

header('Content-Type: application/json');

// ❌ HAPUS BAGIAN INI (Biar halaman Login bisa dapat token)
// if (!isset($_SESSION['user'])) { ... }

// Generate atau Ambil Token
$token = CsrfProtection::getToken();

echo json_encode([
    'success' => true,
    'token' => $token
]);
?>