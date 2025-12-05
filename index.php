<?php
// FILE: index.php
// Fungsi: Mengaktifkan PHP Session dan memuat tampilan utama.
session_start(); 
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWIMS – Secure Warehouse Inventory System</title>
  <!-- Pastikan file CSS Anda sudah ada di sini -->
  <link rel="stylesheet" href="css/style.css"> 
</head>
<body>
  <header>
    <div class="brand">
      <h1>SWIMS</h1>
      <p class="subtitle">Secure Warehouse Inventory Management System</p>
    </div>
    <div id="userBar" class="userbar"></div>
  </header>

  <nav id="menuBar" class="menu"></nav>

  <main id="content" class="container"></main>

  <!-- QR code lib (Untuk fitur Supervisor Notes) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <!-- Load JavaScript Logic -->
  <script src="js/app.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/user_management.js"></script> 
  <script src="js/dashboard.js"></script> 
  <script src="js/transactions.js"></script>
  <script src="js/approval.js"></script> 
  
  <script src="js/notes.js"></script>
  <script src="js/reports.js"></script>
  <script>
    // Inisialisasi aplikasi. Memuat status user dari Session/API
    checkSessionAndRender(); 
    // loadPage('login'); // Tidak perlu, karena checkSessionAndRender akan memuat halaman yang sesuai
  </script>
</body>
</html>