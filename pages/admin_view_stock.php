<!-- ============================================================================
FILE: pages/admin_view_stock.php - Read-Only Stock View for Admin
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📦 View Stock (Read-Only)</h2>
        <button class="btn primary btn-sm" onclick="exportStockToExcel()">📄 Export to Excel</button>
    </div>
    <p class="small">Administrator dapat melihat stok gudang per klien (read-only untuk keamanan).</p>
</div>

<!-- Summary Stats -->
<div class="card" style="background:#f0f9ff; border-color:#3b82f6;">
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Jenis Barang</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalItems">-</div>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Stok</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalStock">-</div>
        </div>
        <div>
            <div class="stat-label" style="font-size:0.85rem; color:#1e3a8a; margin-bottom:5px;">Total Supplier/Client</div>
            <div class="stat-value" style="font-size:1.5rem; color:#1e40af;" id="totalSuppliers">-</div>
        </div>
    </div>
</div>

<!-- Filters -->
<div class="card">
    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px;">
        <div>
            <label style="margin:0 0 8px 0;">🏢 Filter by Supplier/Client:</label>
            <select id="supplierFilter" onchange="filterStock()" style="margin:0; width:100%;">
                <option value="">-- Semua Supplier --</option>
            </select>
        </div>
        <div>
            <label style="margin:0 0 8px 0;">🔍 Search SKU/Nama:</label>
            <input type="text" id="searchStock" placeholder="Ketik untuk mencari..." 
                   style="width:100%; margin:0;" oninput="searchStock()">
        </div>
    </div>
</div>

<!-- Stock Table -->
<div class="card">
    <div id="stockTableContainer">
        <p style="text-align:center;">⏳ Memuat data stok...</p>
    </div>
</div>

<!-- Info Panel -->
<div class="card" style="background:#fef3c7; border-left:4px solid #f59e0b;">
    <h3 style="margin-top:0; color:#92400e;">⚠️ Catatan Penting</h3>
    <ul style="margin:0; padding-left:20px; color:#78350f;">
        <li><strong>Read-Only:</strong> Admin TIDAK dapat mengubah stok secara langsung</li>
        <li><strong>Keamanan:</strong> Semua perubahan stok harus melalui workflow approval Supervisor</li>
        <li><strong>Audit Trail:</strong> Semua aktivitas view stock tercatat dalam system logs</li>
        <li><strong>Export:</strong> Gunakan tombol Export untuk mendapatkan data dalam format Excel</li>
    </ul>
</div>

<script>
console.log('📦 Admin View Stock v1.0 - Read-Only');

// ========================================
// GLOBAL STATE
// ========================================
let allStockData = [];
let filteredStockData = [];

// ========================================
// INIT PAGE
// ========================================
async function init_admin_view_stock() {
    console.log('🚀 Initializing admin view stock...');
    await loadStockData();
}

// ========================================
// LOAD STOCK DATA
// ========================================
async function loadStockData() {
    const container = document.getElementById('stockTableContainer');
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat data stok...</p>';
    
    showLoadingModal('Mengambil data stok...');
    
    try {
        // Fetch stock data (approved items only)
        const response = await fetch('api/items.php?action=available');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        allStockData = data.data;
        filteredStockData = allStockData;
        
        console.log('✅ Stock data loaded:', allStockData.length);
        
        // Populate supplier filter
        populateSupplierFilter();
        
        // Update summary
        updateSummary();
        
        // Render table
        renderStockTable(filteredStockData);
        
    } catch (error) {
        console.error('Load stock error:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--danger); font-weight:600;">❌ Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadStockData()">🔄 Coba Lagi</button>
            </div>
        `;
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// POPULATE SUPPLIER FILTER
// ========================================
function populateSupplierFilter() {
    const filter = document.getElementById('supplierFilter');
    
    // Get unique suppliers
    const suppliers = [...new Map(
        allStockData.map(item => [item.supplier_id, {
            id: item.supplier_id,
            name: item.supplier_name
        }])
    ).values()];
    
    filter.innerHTML = '<option value="">-- Semua Supplier --</option>';
    suppliers.forEach(s => {
        filter.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
}

// ========================================
// UPDATE SUMMARY STATS
// ========================================
function updateSummary() {
    const totalItems = allStockData.length;
    const totalStock = allStockData.reduce((sum, item) => sum + parseInt(item.current_stock || 0), 0);
    const totalSuppliers = new Set(allStockData.map(item => item.supplier_id)).size;
    
    document.getElementById('totalItems').textContent = totalItems.toLocaleString();
    document.getElementById('totalStock').textContent = totalStock.toLocaleString();
    document.getElementById('totalSuppliers').textContent = totalSuppliers;
}

// ========================================
// RENDER STOCK TABLE
// ========================================
function renderStockTable(data) {
    const container = document.getElementById('stockTableContainer');
    
    if (data.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="font-size:3rem; margin:0;">📦</p>
                <p style="color:var(--muted); font-weight:600;">Tidak ada data yang sesuai filter</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nama Barang</th>
                    <th style="text-align:center;">Jumlah Stok</th>
                    <th>Unit</th>
                    <th>Supplier/Client</th>
                    <th>Last Update</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
        const stock = parseInt(item.current_stock);
        let stockStyle = 'color: var(--success); font-weight: 600;';
        if (stock === 0) {
            stockStyle = 'color: var(--danger); font-weight: 600;';
        } else if (stock < 10) {
            stockStyle = 'color: var(--warning); font-weight: 600;';
        }
        
        const lastUpdate = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-';
        
        html += `
            <tr>
                <td><strong>${item.sku}</strong></td>
                <td>${item.name}</td>
                <td style="text-align:center;">
                    <span style="${stockStyle}; font-size:1.1rem;">
                        ${stock.toLocaleString()}
                    </span>
                </td>
                <td>${item.unit}</td>
                <td>${item.supplier_name}</td>
                <td class="small">${lastUpdate}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========================================
// FILTER STOCK
// ========================================
function filterStock() {
    const supplierId = document.getElementById('supplierFilter').value;
    const searchQuery = document.getElementById('searchStock').value.trim().toLowerCase();
    
    filteredStockData = allStockData;
    
    if (supplierId) {
        filteredStockData = filteredStockData.filter(item => item.supplier_id == supplierId);
    }
    
    if (searchQuery) {
        filteredStockData = filteredStockData.filter(item => 
            item.sku.toLowerCase().includes(searchQuery) ||
            item.name.toLowerCase().includes(searchQuery)
        );
    }
    
    renderStockTable(filteredStockData);
}

// ========================================
// SEARCH STOCK
// ========================================
function searchStock() {
    filterStock();
}

// ========================================
// EXPORT TO EXCEL (Simple CSV)
// ========================================
function exportStockToExcel() {
    if (filteredStockData.length === 0) {
        showMessageModal('Info', 'Tidak ada data untuk diekspor.', false);
        return;
    }
    
    // Generate CSV
    let csv = 'SKU,Nama Barang,Jumlah Stok,Unit,Supplier/Client,Last Update\n';
    
    filteredStockData.forEach(item => {
        const lastUpdate = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-';
        csv += `"${item.sku}","${item.name}",${item.current_stock},"${item.unit}","${item.supplier_name}","${lastUpdate}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showMessageModal('✅ Sukses', 'Data stok berhasil diekspor ke Excel/CSV!', false);
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_admin_view_stock = init_admin_view_stock;
window.loadStockData = loadStockData;
window.filterStock = filterStock;
window.searchStock = searchStock;
window.exportStockToExcel = exportStockToExcel;

console.log('✅ Admin View Stock Module loaded');
</script>