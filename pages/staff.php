<!-- STAFF -->
<div class="page-welcome card">
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2 style="margin:0;">Dashboard Staff</h2>
      <p class="small" style="margin-top:6px;">Selamat datang, <span id="staffWelcome">Loading...</span></p>
    </div>
    <div>
      <button class="btn btn-sm primary" onclick="loadPage && loadPage('request_item')">+ Request Baru</button>
    </div>
  </div>
</div>

<div id="staffStats" class="stat-grid" aria-live="polite">
  <!-- JS akan meng-inject .stat-card di sini -->
  <!-- Contoh fallback sementara (akan di-overwrite oleh JS): -->
  <div class="stat-card">
    <div class="label">Memuat...</div>
    <div class="value">—</div>
  </div>
</div>
