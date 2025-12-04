<?php
// FILE: includes/db_config.php
// Fungsi: Koneksi ke database MySQL menggunakan PDO (Secure)

$host = 'localhost';
$db   = 'swims_db'; 
$user = 'root';     
$pass = '';         // Ganti dengan password MySQL Anda jika ada
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    // Wajib: Tampilkan exceptions, fetch asosiatif, dan MENCEGAH SQL INJECTION
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     // Variabel $pdo siap digunakan di seluruh aplikasi
} catch (\PDOException $e) {
     // Jika gagal, hentikan aplikasi
     exit("Koneksi Database Gagal: Periksa WAMP dan database 'swims_db'. Error: " . $e->getMessage());
}
?>