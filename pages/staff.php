<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">📊</span> Staff Dashboard
        </h2>
    </div>
    <div id="staffWelcome">
        <!-- Selamat datang akan dimuat oleh JS -->
    </div>
</div>

<!-- Statistik Dashboard (mirip dengan referensi visual) -->
<div id="staffStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom: 20px;">
    <!-- Kartu Statistik akan dimuat oleh loadStaffDashboard() -->
</div>

<div class="card">
  <h3>Quick Links</h3>
  <p>
    <!-- Tombol yang sudah ada dan siap digunakan -->
    <button class="btn primary" onclick="loadPage('barang_masuk')">Form Barang Masuk</button>
    <button class="btn primary" onclick="loadPage('barang_keluar')">Form Barang Keluar</button>
    <button class="btn success" onclick="loadPage('request_item')">Request Klien/Supplier</button>
  </p>
</div>

<script>
    // Fungsi loadStaffDashboard dipanggil secara otomatis oleh init_staff() di js/app.js.
    // Tidak ada logika tambahan di sini kecuali panggilan ke fungsi yang sudah ada.
    window.init_staff = function() {
        // MUAT DATA MASTER (penting untuk form) DAN TAMPILKAN DASHBOARD
        loadMasterData().then(loadStaffDashboard);
    }
</script>