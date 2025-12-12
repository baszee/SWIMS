<!-- SUPERVISOR -->
<div class="page-welcome card">
  <h2 style="margin:0;">Supervisor Dashboard</h2>
  <p class="small" style="margin-top:6px;">Selamat datang, <b id="supervisorName">Loading...</b>. Monitor dan approve aktivitas gudang.</p>
</div>

<div id="supervisorStats" class="stat-grid" aria-live="polite">
  <div class="stat-card">
    <div class="label">Memuat statistik...</div>
    <div class="value">—</div>
  </div>
</div>

<div class="card">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
    <h3 style="margin:0;">Transaksi Pending Terbaru</h3>
    <button class="btn btn-sm primary" onclick="loadPage && loadPage('approval')">Lihat Semua →</button>
  </div>
  <div id="recentTransactions"><p style="text-align:center;">⏳ Memuat...</p></div>
</div>

<div class="card">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
    <h3 style="margin:0;">Request Baru Menunggu Approval</h3>
    <button class="btn btn-sm primary" onclick="loadPage && loadPage('approval_items')">Lihat Semua →</button>
  </div>
  <div id="recentItems"><p style="text-align:center;">⏳ Memuat...</p></div>
</div>
