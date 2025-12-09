<!-- FILE: pages/inventory.php - Inventory Stock Page (NO INLINE SCRIPT) -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📦 Inventaris Stok Gudang</h2>
        <button class="btn primary btn-sm" onclick="loadInventoryData()">🔄 Refresh Data</button>
    </div>
    <p class="small">Daftar lengkap semua item yang tersimpan di gudang beserta jumlah stok terkini.</p>
</div>

<!-- Filter & Summary -->
<div class="card" style="background:#f0f9ff; border-color:#3b82f6;">
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Item</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalItems">-</div>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Stok</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalStock">-</div>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#92400e; margin-bottom:5px;">Stok Rendah</div>
            <div class="stat-value" style="font-size:1.5rem; color:#d97706;" id="lowStockCount">-</div>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#166534; margin-bottom:5px;">Item Approved</div>
            <div class="stat-value" style="font-size:1.5rem; color:#16a34a;" id="approvedItems">-</div>
        </div>
    </div>
</div>

<!-- Filter Controls -->
<div class="card">
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <label style="margin:0; font-weight:600;">Filter:</label>
        <button class="btn primary btn-sm" onclick="filterInventory('ALL')">Semua Item</button>
        <button class="btn btn-sm" onclick="filterInventory('LOW')">Stok Rendah</button>
        <button class="btn btn-sm" onclick="filterInventory('OUT')">Stok Habis</button>
        
        <label style="margin:0 0 0 auto; font-weight:600;">Cari:</label>
        <input type="text" id="searchInventory" placeholder="Cari SKU atau Nama..." 
               style="width:250px; padding:6px 10px; margin:0;" 
               oninput="searchInventory()">
    </div>
    <p class="small" style="margin:10px 0 0 0; color:var(--muted);" id="filterStatus">Menampilkan: Semua Item</p>
</div>

<!-- Inventory Table -->
<div class="card">
    <div id="inventoryTableContainer">
        <p style="text-align:center;">⏳ Memuat data inventaris...</p>
    </div>
</div>

<!-- Logic ada di js/inventory.js -->