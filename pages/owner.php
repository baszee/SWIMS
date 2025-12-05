<div class="card">
    <h2>👑 Owner Dashboard</h2>
    <p class="small">Selamat datang, Owner! Berikut adalah ringkasan status operasional gudang saat ini.</p>
</div>

<!-- Statistik Ringkasan -->
<div id="ownerStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
    <!-- Konten akan dimuat oleh init_owner() -->
    <div class="card"><p>Memuat statistik...</p></div>
</div>

<!-- Peringatan Stok Rendah -->
<div id="lowStockWarning">
    <!-- Peringatan akan muncul di sini -->
</div>


<script>
    // ----------- Logika Dashboard Owner (JS) -----------

    async function loadOwnerDashboard() {
        const statsDiv = document.getElementById('ownerStats');
        const warningDiv = document.getElementById('lowStockWarning');
        statsDiv.innerHTML = '';
        warningDiv.innerHTML = '';
        showLoadingModal('Mengambil data ringkasan...');

        try {
            // Memanggil API Summary yang sudah kita buat
            const response = await fetch('api/report.php?action=summary');
            const data = await response.json();
            
            if (!data.success) {
                statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
                return;
            }

            const stats = data.data;

            // 1. Rendering Statistik
            statsDiv.innerHTML = `
                <div class="stat-box">
                    <div class="stat-label">Total Jenis Barang</div>
                    <div class="stat-value">${stats.total_items.toLocaleString()}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Stok Semua Item</div>
                    <div class="stat-value">${stats.total_stock.toLocaleString()} Pcs</div>
                </div>
                <div class="stat-box warn">
                    <div class="stat-label">Pending Transaksi</div>
                    <div class="stat-value">${stats.transactions.pending}</div>
                </div>
                <div class="stat-box success">
                    <div class="stat-label">Approved Transaksi</div>
                    <div class="stat-value">${stats.transactions.approved}</div>
                </div>
                <div class="stat-box danger">
                    <div class="stat-label">Item Baru PENDING Approval</div>
                    <div class="stat-value">${stats.pending_items}</div>
                </div>
            `;
            
            // 2. Rendering Peringatan Stok Rendah
            if (stats.low_stock > 0) {
                warningDiv.innerHTML = `
                    <div class="card" style="margin-top:16px; background:#fef3c7; border-color:#f59e0b;">
                        <h4 style="margin-top:0; color:var(--warning);">🚨 PERINGATAN STOK RENDAH</h4>
                        <p style="color:#92400e; margin:0;">Terdapat **${stats.low_stock}** jenis item yang sudah mencapai atau di bawah Stok Minimum. Mohon periksa Laporan Inventaris.</p>
                    </div>
                `;
            }

        } catch (error) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard.</p></div>`;
            console.error('Owner Dashboard load error:', error);
        } finally {
            hideLoadingModal();
        }
    }

    // Fungsi init_owner: Dipanggil saat halaman dimuat
    window.init_owner = function() {
        loadOwnerDashboard();
    }
</script>