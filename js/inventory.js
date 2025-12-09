/**
 * =========================================================
 * INVENTORY.JS - WAREHOUSE INVENTORY MANAGEMENT v3.0
 * Features:
 * - Supplier-based filtering
 * - Real-time search
 * - Clean & focused display
 * - No redundant status columns
 * =========================================================
 */

console.log('📦 INVENTORY MODULE v3.0 - Loading...');

// ========================================
// GLOBAL STATE
// ========================================
let inventoryData = [];
let filteredData = [];
let suppliersData = [];
let currentSupplierFilter = '';

// ========================================
// LOAD INVENTORY DATA
// ========================================
async function loadInventoryData() {
    console.log('📊 Loading inventory data...');
    
    const container = document.getElementById('inventoryTableContainer');
    if (!container) {
        console.error('❌ inventoryTableContainer not found!');
        return;
    }
    
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat data inventaris...</p>';
    showLoadingModal('Mengambil data inventaris...');
    
    try {
        // Fetch items (approved only)
        console.log('📡 Fetching approved items...');
        const itemsResponse = await fetch('api/items.php?action=available');
        
        if (!itemsResponse.ok) {
            throw new Error(`HTTP ${itemsResponse.status}: ${itemsResponse.statusText}`);
        }
        
        const itemsData = await itemsResponse.json();
        console.log('✅ API Response:', itemsData);
        
        if (!itemsData.success) {
            throw new Error(itemsData.message || 'API returned error');
        }
        
        // Validate data
        if (!itemsData.data || itemsData.data.length === 0) {
            console.log('⚠️ No items found');
            container.innerHTML = `
                <div style="text-align:center; padding:50px;">
                    <p style="font-size:3rem; margin:0;">📦</p>
                    <p style="color:var(--muted); font-weight:600;">Belum ada barang di gudang</p>
                    <p class="small">Barang akan muncul setelah transaksi approved oleh Supervisor</p>
                </div>
            `;
            updateSummary([], []);
            return;
        }
        
        // Process data
        inventoryData = itemsData.data.map(item => ({
            id: item.id,
            sku: item.sku,
            item_name: item.name || item.item_name,
            current_stock: parseInt(item.current_stock) || 0,
            unit: item.unit,
            supplier_id: item.supplier_id,
            supplier_name: item.supplier_name,
            created_at: item.created_at
        }));
        
        console.log('📦 Processed items:', inventoryData.length);
        
        // Extract unique suppliers
        suppliersData = [...new Map(
            inventoryData.map(item => [item.supplier_id, {
                id: item.supplier_id,
                name: item.supplier_name
            }])
        ).values()].sort((a, b) => a.name.localeCompare(b.name));
        
        console.log('🏢 Suppliers found:', suppliersData.length);
        
        // Populate supplier dropdown
        populateSupplierDropdown();
        
        // Initial render (all items)
        filteredData = [...inventoryData];
        updateSummary(inventoryData, suppliersData);
        renderInventoryTable(filteredData);
        
        console.log('✅ Inventory loaded successfully!');
        
    } catch (error) {
        console.error('❌ Load inventory error:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--danger); font-weight:600;">❌ Error Jaringan</p>
                <p class="small">${error.message}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:6px; margin:15px 0; text-align:left;">
                    <h4 style="margin-top:0;">🔧 Troubleshooting:</h4>
                    <ul class="small" style="margin:0;">
                        <li>Pastikan WAMP/XAMPP sudah running</li>
                        <li>Cek file <code>api/items.php</code> ada dan tidak error</li>
                        <li>Buka Console (F12) untuk melihat detail error</li>
                        <li>Pastikan database terhubung dengan baik</li>
                    </ul>
                </div>
                <button class="btn primary btn-sm" onclick="loadInventoryData()">🔄 Coba Lagi</button>
            </div>
        `;
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// POPULATE SUPPLIER DROPDOWN
// ========================================
function populateSupplierDropdown() {
    const dropdown = document.getElementById('filterSupplier');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Semua Supplier --</option>';
    
    suppliersData.forEach(supplier => {
        dropdown.innerHTML += `<option value="${supplier.id}">${supplier.name}</option>`;
    });
    
    console.log('✅ Supplier dropdown populated');
}

// ========================================
// UPDATE SUMMARY STATS
// ========================================
function updateSummary(items, suppliers) {
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + parseInt(item.current_stock || 0), 0);
    const totalSuppliers = suppliers.length;
    
    const totalItemsEl = document.getElementById('totalItems');
    const totalStockEl = document.getElementById('totalStock');
    const totalSuppliersEl = document.getElementById('totalSuppliers');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
    if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString();
    if (totalSuppliersEl) totalSuppliersEl.textContent = totalSuppliers;
    
    console.log('📊 Summary stats updated:', { totalItems, totalStock, totalSuppliers });
}

// ========================================
// RENDER INVENTORY TABLE
// ========================================
function renderInventoryTable(data) {
    const container = document.getElementById('inventoryTableContainer');
    
    if (!container) {
        console.error('❌ inventoryTableContainer not found!');
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--muted); font-weight:600;">Tidak ada data yang sesuai filter</p>
                <button class="btn primary btn-sm" onclick="resetFilters()">Reset Filter</button>
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
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
        const stock = parseInt(item.current_stock);
        
        // Color coding for stock (subtle, no badge)
        let stockStyle = 'color: var(--success); font-weight: 600;';
        if (stock === 0) {
            stockStyle = 'color: var(--danger); font-weight: 600;';
        } else if (stock < 10) {
            stockStyle = 'color: var(--warning); font-weight: 600;';
        }
        
        html += `
            <tr>
                <td><strong>${item.sku}</strong></td>
                <td>${item.item_name}</td>
                <td style="text-align:center;">
                    <span style="${stockStyle}; font-size:1.1rem;">
                        ${stock.toLocaleString()}
                    </span>
                </td>
                <td>${item.unit}</td>
                <td>${item.supplier_name}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    console.log('✅ Table rendered with', data.length, 'items');
}

// ========================================
// FILTER BY SUPPLIER
// ========================================
function filterBySupplier() {
    const dropdown = document.getElementById('filterSupplier');
    const selectedSupplierId = dropdown.value;
    const filterStatus = document.getElementById('filterStatus');
    
    currentSupplierFilter = selectedSupplierId;
    
    console.log('🔍 Filtering by supplier:', selectedSupplierId);
    
    // Clear search when changing supplier
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) searchInput.value = '';
    
    if (!selectedSupplierId) {
        // Show all
        filteredData = [...inventoryData];
        if (filterStatus) {
            filterStatus.innerHTML = 'Menampilkan: <strong>Semua Item</strong>';
        }
    } else {
        // Filter by supplier
        filteredData = inventoryData.filter(item => item.supplier_id == selectedSupplierId);
        
        const supplierName = suppliersData.find(s => s.id == selectedSupplierId)?.name || 'Unknown';
        
        if (filterStatus) {
            filterStatus.innerHTML = `Menampilkan: <strong>${supplierName}</strong> (${filteredData.length} items)`;
        }
    }
    
    renderInventoryTable(filteredData);
    console.log('✅ Filter applied -', filteredData.length, 'items displayed');
}

// ========================================
// SEARCH INVENTORY
// ========================================
function searchInventory() {
    const searchInput = document.getElementById('searchInventory');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    console.log('🔍 Searching:', query);
    
    // Base data: filtered by supplier OR all items
    let baseData = currentSupplierFilter 
        ? inventoryData.filter(item => item.supplier_id == currentSupplierFilter)
        : [...inventoryData];
    
    if (!query) {
        // No search query, show base data
        filteredData = baseData;
    } else {
        // Search within base data
        filteredData = baseData.filter(item => 
            item.sku.toLowerCase().includes(query) || 
            item.item_name.toLowerCase().includes(query) ||
            item.supplier_name.toLowerCase().includes(query)
        );
    }
    
    renderInventoryTable(filteredData);
    console.log('✅ Search completed -', filteredData.length, 'results');
}

// ========================================
// RESET FILTERS
// ========================================
function resetFilters() {
    const supplierDropdown = document.getElementById('filterSupplier');
    const searchInput = document.getElementById('searchInventory');
    
    if (supplierDropdown) supplierDropdown.value = '';
    if (searchInput) searchInput.value = '';
    
    currentSupplierFilter = '';
    filteredData = [...inventoryData];
    
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.innerHTML = 'Menampilkan: <strong>Semua Item</strong>';
    }
    
    renderInventoryTable(filteredData);
    console.log('✅ Filters reset');
}

// ========================================
// INIT FUNCTION
// ========================================
function init_inventory() {
    console.log('🚀 Init Inventory Page v3.0');
    console.log('   → Simplified stats (no low stock, no approval status)');
    console.log('   → Supplier-based filtering');
    console.log('   → Clean table display');
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        loadInventoryData();
    }, 100);
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_inventory = init_inventory;
window.loadInventoryData = loadInventoryData;
window.filterBySupplier = filterBySupplier;
window.searchInventory = searchInventory;
window.resetFilters = resetFilters;

console.log('✅ Inventory Module v3.0 loaded');
console.log('   Exposed functions:', {
    init_inventory: typeof window.init_inventory,
    loadInventoryData: typeof window.loadInventoryData,
    filterBySupplier: typeof window.filterBySupplier,
    searchInventory: typeof window.searchInventory,
    resetFilters: typeof window.resetFilters
});