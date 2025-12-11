<div class="card">
    <h2>👑 Owner Dashboard</h2>
    <p class="small">Selamat datang, Owner! Berikut adalah ringkasan status operasional gudang saat ini.</p>
</div>

<div id="ownerStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
    <div class="card"><p>Memuat statistik...</p></div>
</div>

<div id="lowStockWarning">
    </div>

<div class="card">
    <h3>⚡ Quick Actions</h3>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn primary" onclick="loadPage('inventory')">
            <span style="font-size:1.2rem;">📦</span> Lihat Stok Inventaris
        </button>
        <button class="btn primary" onclick="loadPage('owner_report')">
            <span style="font-size:1.2rem;">📊</span> Monitoring & Laporan
        </button>
        <button class="btn success" onclick="loadPage('notes')">
            <span style="font-size:1.2rem;">📝</span> Notes Internal
        </button>
        <button class="btn primary" onclick="loadPage('history_transaksi')">
            <span style="font-size:1.2rem;">📋</span> History Transaksi
        </button>
    </div>
</div>

<script>
// Logic handled by js/dashboard.js
</script>