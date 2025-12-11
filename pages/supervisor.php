<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem;">📊</span> Supervisor Dashboard
        </h2>
    </div>
    <p class="small">Selamat datang, <b id="supervisorName">Loading...</b>. Monitor dan approve semua aktivitas gudang di sini.</p>
</div>

<div id="supervisorStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom: 20px;">
    <div class="card"><p style="text-align:center;">⏳ Memuat statistik...</p></div>
</div>

<div class="card" id="recentTransactionsCard">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin:0;">📋 Transaksi Pending Terbaru</h3>
        <button class="btn primary btn-sm" onclick="loadPage('approval')">Lihat Semua →</button>
    </div>
    <div id="recentTransactions">
        <p style="text-align:center;">⏳ Memuat...</p>
    </div>
</div>

<div class="card" id="recentItemsCard">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin:0;">📦 Request Baru Menunggu Approval</h3>
        <button class="btn primary btn-sm" onclick="loadPage('approval_items')">Lihat Semua →</button>
    </div>
    <div id="recentItems">
        <p style="text-align:center;">⏳ Memuat...</p>
    </div>
</div>

<div class="card">
    <h3 style="margin-top:0;">⚡ Quick Actions</h3>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn primary" onclick="loadPage('approval')">
            <span style="font-size:1.2rem;">✅</span> Approval Transaksi
        </button>
        <button class="btn primary" onclick="loadPage('approval_items')">
            <span style="font-size:1.2rem;">📦</span> Approval Barang/Klien Baru
        </button>
        <button class="btn success" onclick="loadPage('notes')">
            <span style="font-size:1.2rem;">📝</span> Notes Internal
        </button>
        <button class="btn primary" onclick="loadPage('history_transaksi')">
            <span style="font-size:1.2rem;">📋</span> History & Nota
        </button>
    </div>
</div>

<div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
    <h3 style="margin-top:0; color:#1e40af;">💡 Panduan Supervisor</h3>
    <ul style="margin:0; padding-left:20px; color:#1e3a8a;">
        <li><strong>Monitor Dashboard:</strong> Cek pending transactions dan requests secara real-time</li>
        <li><strong>Approval Cepat:</strong> Approve/reject langsung dari dashboard atau halaman approval</li>
        <li><strong>QR Nota:</strong> Setiap transaksi approved otomatis generate PDF dengan QR code</li>
        <li><strong>Notes:</strong> Gunakan untuk komunikasi penting dengan Owner dan Supervisor lain</li>
        <li><strong>History:</strong> Semua nota approved dapat di-download PDF kapan saja</li>
    </ul>
</div>

<script>
// NO INLINE LOGIC - All initialization is now handled by js/dashboard.js
</script>