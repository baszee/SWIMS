<!-- ============================================================================
FILE: pages/admin_activity_logs.php - SIMPLIFIED v4.0
All logic moved to js/activity_logs.js
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div>
            <h2 style="margin:0; display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.8rem;">📋</span> Activity Logs
            </h2>
            <p class="small" style="margin:5px 0 0 0;">Complete audit trail untuk semua aktivitas sistem SWIMS</p>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" onclick="exportActivityLogs()">📄 Export CSV</button>
            <button class="btn btn-sm" onclick="cleanOldActivityLogs()">🗑️ Clean Old</button>
            <button class="btn primary btn-sm" onclick="refreshActivityLogs()">🔄 Refresh</button>
        </div>
    </div>
</div>

<!-- Stats Cards -->
<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;" id="activityStatsCards">
    <div class="card" style="text-align:center;">
        <p class="small" style="margin:0; color:var(--muted);">Total Logs</p>
        <p style="font-size:2rem; font-weight:700; margin:5px 0; color:var(--primary);" id="statTotal">-</p>
    </div>
</div>

<!-- Filters -->
<div class="card">
    <h3 style="margin-top:0;">🔍 Filter & Search</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">User</label>
            <select id="filterUser" onchange="applyActivityFilters()" style="margin:0;">
                <option value="">-- Semua User --</option>
            </select>
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Action Type</label>
            <select id="filterAction" onchange="applyActivityFilters()" style="margin:0;">
                <option value="">-- Semua Action --</option>
                <option value="LOGIN">🔐 LOGIN</option>
                <option value="LOGOUT">🚪 LOGOUT</option>
                <option value="CREATE">➕ CREATE</option>
                <option value="UPDATE">✏️ UPDATE</option>
                <option value="DELETE">🗑️ DELETE</option>
                <option value="APPROVE">✅ APPROVE</option>
                <option value="REJECT">❌ REJECT</option>
                <option value="VIEW">👁️ VIEW</option>
                <option value="DEACTIVATE">🔒 DEACTIVATE</option>
            </select>
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Dari Tanggal</label>
            <input type="date" id="filterDateFrom" onchange="applyActivityFilters()" style="margin:0;">
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Sampai Tanggal</label>
            <input type="date" id="filterDateTo" onchange="applyActivityFilters()" style="margin:0;">
        </div>
    </div>
    
    <div style="margin-top: 12px;">
        <label style="margin: 0 0 5px 0; font-weight:600;">Cari dalam Deskripsi</label>
        <div style="display: flex; gap: 8px;">
            <input type="text" id="searchBox" placeholder="Ketik untuk mencari..." style="flex: 1; margin: 0;" onkeyup="handleSearchKeyup(event)">
            <button class="btn primary" onclick="applyActivityFilters()">🔍 Search</button>
            <button class="btn" onclick="resetActivityFilters()">🔄 Reset</button>
        </div>
    </div>
    
    <div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p class="small" style="margin: 0; color: #1e3a8a;" id="filterStatus">
            Menampilkan: <strong>100 logs terakhir</strong>
        </p>
    </div>
</div>

<!-- Activity Logs Table -->
<div class="card">
    <div id="activityLogsContainer">
        <p style="text-align: center;">⏳ Memuat activity logs...</p>
    </div>
</div>

<!-- Tips -->
<div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
    <h4 style="margin-top:0; color:#1e40af;">💡 Tips Penggunaan</h4>
    <ul class="small" style="margin:0; padding-left:20px; color:#1e3a8a;">
        <li><strong>Filter:</strong> Gunakan filter untuk mempersempit hasil pencarian</li>
        <li><strong>Export:</strong> Download logs dalam format CSV untuk analisis lebih lanjut</li>
        <li><strong>Clean Old:</strong> Hapus logs lama (>90 hari) untuk menghemat space database</li>
        <li><strong>Detail:</strong> Klik tombol 👁️ Detail untuk melihat metadata lengkap</li>
    </ul>
</div>

<!-- NO INLINE SCRIPT - All logic in js/activity_logs.js -->