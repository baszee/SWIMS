<?php
// FILE: index.php
// SWIMS v2.0 - Sidebar Layout
session_start(); 
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWIMS – Secure Warehouse Inventory System</title>
  <link rel="stylesheet" href="css/style.css"> 
</head>
<body>
  
  <!-- App Container -->
  <div class="app-container">
    
    <!-- ========================================
         SIDEBAR NAVIGATION
         ======================================== -->
    <aside class="sidebar" id="sidebar">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <h1>SWIMS</h1>
        <p class="subtitle">Warehouse Inventory System</p>
      </div>
      
      <!-- User Info -->
      <div class="sidebar-user" id="sidebarUser">
        <!-- Will be populated by JS -->
      </div>
      
      <!-- Navigation Menu -->
      <nav class="sidebar-nav" id="sidebarNav">
        <!-- Will be populated by JS -->
      </nav>
      
      <!-- Logout Button -->
      <div class="sidebar-footer">
        <button class="btn-logout" onclick="logout()">
          <span style="font-size:1.2rem;"></span> Logout
        </button>
      </div>
    </aside>
    
    <!-- ========================================
         MAIN CONTENT AREA
         ======================================== -->
    <main class="main-content">
      <!-- Content Header (Page Title) -->
      <header class="content-header" id="contentHeader">
        <h1 class="page-title" id="pageTitle">Dashboard</h1>
        <div class="breadcrumb" id="breadcrumb">Loading...</div>
      </header>
      
      <!-- Content Body -->
      <div class="content-body" id="content">
        <!-- Page content loaded by JS -->
        <div class="card">
          <p style="text-align:center; padding:40px;">
            <span style="font-size:3rem;">⏳</span><br>
            <strong>Loading SWIMS...</strong>
          </p>
        </div>
      </div>
    </main>
    
  </div>

  <!-- External Libraries -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

  <script src="js/security_utils.js"></script>

  <!-- App Scripts -->
  <script src="js/theme_manager.js"></script>
  <script src="js/app.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/user_management.js"></script> 
  <script src="js/dashboard.js"></script>
  <script src="js/transactions.js"></script>
  <script src="js/approval.js"></script>
  <script src="js/notes.js"></script>
  <script src="js/history_transaksi.js"></script>
  <script src="js/request_item.js"></script>
  <script src="js/inventory.js"></script>
  <script src="js/activity_logs.js"></script>
  <script src="js/owner_report.js"></script>
  <script src="js/pdf_generator.js"></script>
    
  <script>
    // Initialize app
    checkSessionAndRender(); 
  </script>
</body>
</html>