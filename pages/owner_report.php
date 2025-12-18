<div class="card">
    <h2>Monitoring dan Laporan SWIMS</h2>
    <p class="small">Owner dapat memantau status persetujuan, stok saat ini, dan riwayat mutasi barang secara keseluruhan.</p>
</div>

<div class="menu" id="reportTabs">
    <button class="btn primary" onclick="renderReport('summary', this)">Ringkasan & Status</button>
    <button class="btn" onclick="renderReport('inventory', this)">Laporan Inventaris Lengkap</button>
    <button class="btn" onclick="renderReport('history', this)">Riwayat Transaksi</button>
</div>

<div id="reportContent">
    </div>

<script>
// Logic Handled by js/owner_report.js
</script>