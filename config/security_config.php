<?php
/**
 * =========================================================
 * FILE: config/security_config.php
 * Purpose: Menyimpan kunci rahasia keamanan
 * PENTING: File ini JANGAN di-upload ke publik/Git!
 * =========================================================
 */

// Kunci Rahasia untuk Hash (Ganti dengan string acak yang panjang)
define('APP_SECRET_KEY', 'SWIMS_2025_SECRET_KEY_JANGAN_DIKASIH_KE_SIAPAPUN_!@#');

// Konfigurasi Keamanan Lainnya
define('SESSION_TIMEOUT', 1800); // 30 menit
define('API_RATE_LIMIT', 10);    // 10 request per menit
?>