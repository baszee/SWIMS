<?php
/**
 * =========================================================
 * GET CSRF TOKEN ENDPOINT
 * File: api/get_csrf_token.php
 * =========================================================
 */
session_start();
include('../utils/CsrfProtection.php');

header('Content-Type: application/json');

// Cek sesi login dulu (Token hanya untuk user login)
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Ambil token
$token = CsrfProtection::getToken();

echo json_encode([
    'success' => true,
    'token' => $token
]);
?>