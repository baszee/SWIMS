<?php
// FILE: config/db_config.php
// Fungsi: Koneksi Database dengan Timezone Sync

// 1. SET TIMEZONE PHP (Wajib agar date() konsisten)
date_default_timezone_set('Asia/Jakarta');

// ✅ SECURITY FIX: Gunakan user terbatas, bukan root
$host = 'localhost';
$db   = 'swims_db'; 
$user = 'swims_user';  // ✅ Limited privilege user
$pass = 'Basze!1234';  // ✅ Ganti dengan password kuat Anda
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     
     // 2. SET TIMEZONE MYSQL (Wajib agar database konsisten dengan PHP)
     $pdo->exec("SET time_zone = '+07:00';");
     
} catch (\PDOException $e) {
     error_log("Database connection failed: " . $e->getMessage());
     
     exit("Koneksi Database Gagal: " . $e->getMessage());
}
?>