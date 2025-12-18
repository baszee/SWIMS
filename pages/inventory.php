<!-- FILE: pages/inventory.php - WAREHOUSE INVENTORY v3.0 -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2> Inventaris Stok Gudang</h2>
        <button class="btn primary btn-sm" onclick="loadInventoryData()"> Refresh Data</button>
    </div>
    <p class="small">Daftar lengkap barang yang tersimpan di gudang SWIMS per Supplier/Client.</p>
</div>

<!-- Summary Stats (SIMPLIFIED) -->
<div class="card" style="background:#f0f9ff; border-color:#3b82f6;">
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Jenis Barang</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalItems">-</div>
            <p class="small" style="margin:5px 0 0 0; color:#1e3a8a;">Item terdaftar</p>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Stok</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalStock">-</div>
            <p class="small" style="margin:5px 0 0 0; color:#1e3a8a;">Unit tersimpan</p>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Supplier</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalSuppliers">-</div>
            <p class="small" style="margin:5px 0 0 0; color:#1e3a8a;">Client aktif</p>
        </div>
    </div>
</div>

<!-- Filter Controls -->
<div class="card">
    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px; align-items:end;">
        <!-- Supplier Filter -->
        <div>
            <label style="margin:0 0 8px 0; font-weight:600;"> Filter by Supplier/Client:</label>
            <select id="filterSupplier" onchange="filterBySupplier()" style="margin:0; width:100%;">
                <option value="">-- Semua Supplier --</option>
            </select>
        </div>
        
        <!-- Search -->
        <div>
            <label style="margin:0 0 8px 0; font-weight:600;"> Cari SKU atau Nama Barang:</label>
            <input type="text" id="searchInventory" placeholder="Ketik untuk mencari..." 
                   style="width:100%; margin:0;" 
                   oninput="searchInventory()">
        </div>
    </div>
    
    <p class="small" style="margin:12px 0 0 0; color:var(--muted);" id="filterStatus">
        Menampilkan: <strong>Semua Item</strong>
    </p>
</div>

<!-- Inventory Table -->
<div class="card">
    <div id="inventoryTableContainer">
        <p style="text-align:center;">⏳ Memuat data inventaris...</p>
    </div>
</div>


<!-- Logic ada di js/inventory.js -->