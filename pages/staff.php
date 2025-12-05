<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">📊</span> Staff Dashboard
        </h2>
    </div>
    <div id="staffWelcome">
        <!-- Text selamat datang akan dimuat di sini -->
    </div>
</div>

<!-- Statistik Dashboard (mirip dengan referensi visual) -->
<div id="staffStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom: 20px;">
    <!-- Konten statistik akan dimuat oleh init_staff() -->
</div>

<div class="card">
  <h3>Quick Links</h3>
  <p>
    <!-- Pastikan button menggunakan styling yang baik, sesuai CSS Anda -->
    <button class="btn primary" onclick="loadPage('barang_masuk')">Form Barang Masuk</button>
    <button class="btn primary" onclick="loadPage('barang_keluar')">Form Barang Keluar</button>
    <button class="btn success" onclick="loadPage('request_item')">Request Barang/Klien</button>
  </p>
</div>

<script>
    // ----------- Logika Dashboard Staff (JS) -----------
    
    async function loadStaffDashboard() {
        const statsDiv = document.getElementById('staffStats');
        const welcomeDiv = document.getElementById('staffWelcome');
        const user = currentUser();
        
        welcomeDiv.innerHTML = `Selamat datang, <b>${user.username}</b>. Gunakan menu untuk mengelola barang.`;
        statsDiv.innerHTML = '';
        showLoadingModal('Mengambil statistik Staff...');

        try {
            // Kita akan buat API endpoint baru untuk statistik Staff
            const response = await fetch('api/report.php?action=staff_summary');
            const data = await response.json();
            
            if (!data.success) {
                statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
                return;
            }

            const stats = data.data;

            // Rendering 4 Kartu Statistik (sesuai referensi image_dea0be.png)
            statsDiv.innerHTML = `
                <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-label">Total Jenis Barang (Approved)</div>
                    <div class="stat-value">${stats.total_items.toLocaleString()}</div>
                </div>
                <div class="stat-box warn">
                    <div class="stat-label">Pending Masuk</div>
                    <div class="stat-value">${stats.pending_in}</div>
                </div>
                <div class="stat-box warn">
                    <div class="stat-label">Pending Keluar</div>
                    <div class="stat-value">${stats.pending_out}</div>
                </div>
                <div class="stat-box danger">
                    <div class="stat-label">Pending Barang/Klien Baru</div>
                    <div class="stat-value">${stats.pending_new_masters}</div>
                </div>
            `;
            
        } catch (error) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard.</p></div>`;
            console.error('Staff Dashboard load error:', error);
        } finally {
            hideLoadingModal();
        }
    }

    // Fungsi init_staff: Dipanggil saat halaman dimuat
    window.init_staff = function() {
        // MUAT DATA MASTER (penting untuk form) DAN TAMPILKAN DASHBOARD
        loadMasterData().then(loadStaffDashboard);
    }
</script>