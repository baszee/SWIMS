/**
 * =========================================================
 * INVENTORY.JS - INVENTORY MODULE
 * Version: 1.2 - STRICT FILTER: Only Approved Items
 * =========================================================
 */

console.log('📦 INVENTORY MODULE v1.2 - Loading (Strict Approved Filter)...');

// ========================================
// GLOBAL STATE
// ========================================
let inventoryData = [];
let filteredData = [];
let currentFilter = 'ALL';

// ========================================
// LOAD INVENTORY DATA
// ========================================
async function loadInventoryData() {
    console.log('📊 Loading inventory data (APPROVED ITEMS ONLY)...');
    
    const user = currentUser();
    const userRole = user?.role;
    console.log('📍 User role:', userRole);
    
    const container = document.getElementById('inventoryTableContainer');
    if (!container) {
        console.error('❌ inventoryTableContainer not found!');
        return;
    }
    
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat data inventaris...</p>';
    
    showLoadingModal('Mengambil data inventaris...');
    
    try {
        // ✅ FETCH: Endpoint 'available' sudah memfilter hanya item APPROVED
        console.log('📡 Fetching APPROVED items from API...');
        const itemsResponse = await fetch('api/items.php?action=available');
        
        if (!itemsResponse.ok) {
            throw new Error(`HTTP ${itemsResponse.status}: ${itemsResponse.statusText}`);
        }
        
        const itemsData = await itemsResponse.json();
        console.log('✅ API Response received');
        console.log('   → Success:', itemsData.success);
        console.log('   → Items count:', itemsData.data?.length || 0);
        
        if (!itemsData.success) {
            throw new Error(itemsData.message || 'API returned error');
        }
        
        // ✅ VALIDASI: Pastikan data ada
        if (!itemsData.data || itemsData.data.length === 0) {
            console.log('⚠️ No items found - showing empty state');
            container.innerHTML = `
                <div style="text-align:center; padding:50px;">
                    <p style="font-size:3rem; margin:0;">📦</p>
                    <p style="color:var(--muted); font-weight:600;">Belum ada item yang approved</p>
                    <p class="small">Item akan muncul di inventaris setelah:</p>
                    <ol class="small" style="text-align:left; display:inline-block; margin:10px auto;">
                        <li>Staff mengajukan Barang Masuk dengan item baru</li>
                        <li>Supervisor menyetujui transaksi tersebut</li>
                        <li>Item otomatis masuk ke inventaris dengan status APPROVED</li>
                    </ol>
                    <button class="btn primary btn-sm" onclick="loadInventoryData()">🔄 Coba Lagi</button>
                </div>
            `;
            updateSummary([]);
            return;
        }
        
        // ✅ DOUBLE CHECK: Validasi bahwa semua item benar-benar approved
        console.log('🔍 Validating item approval status...');
        const nonApprovedItems = itemsData.data.filter(item => item.is_approved != 1);
        
        if (nonApprovedItems.length > 0) {
            console.error('❌ CRITICAL: Found non-approved items in "available" endpoint!');
            console.error('   → Non-approved items:', nonApprovedItems);
            console.error('   → This should not happen - API filter is broken!');
            
            // Filter di frontend sebagai fallback
            itemsData.data = itemsData.data.filter(item => item.is_approved == 1);
            console.log('   → Frontend filter applied, remaining items:', itemsData.data.length);
        } else {
            console.log('✅ Validation passed: All items are APPROVED');
        }
        
        // ✅ PROCESS: Normalize data
        inventoryData = itemsData.data.map(item => {
            return {
                id: item.id,
                sku: item.sku,
                item_name: item.name || item.item_name,
                current_stock: parseInt(item.current_stock) || 0,
                unit: item.unit,
                min_stock: parseInt(item.min_stock) || 10,
                supplier_name: item.supplier_name,
                is_approved: 1, // ✅ Guaranteed approved
                created_at: item.created_at
            };
        });
        
        console.log('📦 Inventory data processed:');
        console.log('   → Total items:', inventoryData.length);
        console.log('   → All items status: APPROVED');
        console.log('   → Sample items:', inventoryData.slice(0, 3).map(i => ({
            sku: i.sku,
            name: i.item_name,
            stock: i.current_stock,
            approved: i.is_approved
        })));
        
        filteredData = [...inventoryData];
        
        updateSummary(inventoryData);
        renderInventoryTable(filteredData);
        
        console.log('✅ Inventory rendered successfully!');
        
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
                        <li>Pastikan database <code>swims_db</code> terhubung</li>
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
// UPDATE SUMMARY STATS
// ========================================
function updateSummary(data) {
    const totalItems = data.length;
    const totalStock = data.reduce((sum, item) => sum + parseInt(item.current_stock || 0), 0);
    const lowStockCount = data.filter(item => {
        const stock = parseInt(item.current_stock);
        const minStock = parseInt(item.min_stock);
        return stock > 0 && stock <= minStock;
    }).length;
    const approvedItems = data.length; // ✅ Semua item di list ini sudah approved
    
    const totalItemsEl = document.getElementById('totalItems');
    const totalStockEl = document.getElementById('totalStock');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const approvedItemsEl = document.getElementById('approvedItems');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
    if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString();
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (approvedItemsEl) approvedItemsEl.textContent = approvedItems;
    
    console.log('📊 Summary stats:', {
        totalItems,
        totalStock,
        lowStockCount,
        approvedItems
    });
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
                <button class="btn primary btn-sm" onclick="filterInventory('ALL')">Reset Filter</button>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nama Item</th>
                    <th>Stok Saat Ini</th>
                    <th>Unit</th>
                    <th>Stok Min</th>
                    <th>Status Stok</th>
                    <th>Klien/Supplier</th>
                    <th>Status Approval</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
        const stock = parseInt(item.current_stock);
        const minStock = parseInt(item.min_stock);
        
        // Determine stock status
        let stockStatusBadge;
        let rowClass = '';
        
        if (stock === 0) {
            stockStatusBadge = '<span class="badge badge-danger">❌ Habis</span>';
            rowClass = 'style="background-color:#fee2e2;"';
        } else if (stock <= minStock) {
            stockStatusBadge = '<span class="badge badge-warning">⚠️ Rendah</span>';
            rowClass = 'style="background-color:#fef3c7;"';
        } else {
            stockStatusBadge = '<span class="badge badge-success">✅ Normal</span>';
        }
        
        // ✅ Item status: ALWAYS APPROVED (guaranteed by API)
        const approvalBadge = '<span class="badge badge-success">✅ APPROVED</span>';
        
        html += `
            <tr ${rowClass}>
                <td><strong>${item.sku}</strong></td>
                <td>${item.item_name}</td>
                <td style="text-align:center;">
                    <strong style="font-size:1.1rem; color:${stock === 0 ? 'var(--danger)' : stock <= minStock ? 'var(--warning)' : 'var(--success)'};">
                        ${stock.toLocaleString()}
                    </strong>
                </td>
                <td>${item.unit}</td>
                <td style="text-align:center;">${minStock}</td>
                <td style="text-align:center;">${stockStatusBadge}</td>
                <td>${item.supplier_name}</td>
                <td style="text-align:center;">${approvalBadge}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    console.log('✅ Table rendered with', data.length, 'approved items');
}

// ========================================
// FILTER INVENTORY
// ========================================
function filterInventory(filterType) {
    currentFilter = filterType;
    
    // Update button states
    const buttons = document.querySelectorAll('.card button[onclick^="filterInventory"]');
    buttons.forEach(btn => btn.className = 'btn btn-sm');
    if (event && event.target) {
        event.target.className = 'btn primary btn-sm';
    }
    
    console.log('🔍 Applying filter:', filterType);
    
    const filterStatus = document.getElementById('filterStatus');
    
    // Apply filter
    if (filterType === 'ALL') {
        filteredData = [...inventoryData];
        if (filterStatus) filterStatus.textContent = 'Menampilkan: Semua Item';
    } else if (filterType === 'LOW') {
        filteredData = inventoryData.filter(item => {
            const stock = parseInt(item.current_stock);
            const minStock = parseInt(item.min_stock);
            return stock > 0 && stock <= minStock;
        });
        if (filterStatus) filterStatus.innerHTML = 'Menampilkan: <strong style="color:var(--warning);">Stok Rendah</strong>';
    } else if (filterType === 'OUT') {
        filteredData = inventoryData.filter(item => parseInt(item.current_stock) === 0);
        if (filterStatus) filterStatus.innerHTML = 'Menampilkan: <strong style="color:var(--danger);">Stok Habis</strong>';
    }
    
    // Clear search
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) searchInput.value = '';
    
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
    
    if (!query) {
        // Reset to current filter
        filterInventory(currentFilter);
        return;
    }
    
    // Search within current filter
    let baseData = [];
    if (currentFilter === 'ALL') {
        baseData = [...inventoryData];
    } else if (currentFilter === 'LOW') {
        baseData = inventoryData.filter(item => {
            const stock = parseInt(item.current_stock);
            const minStock = parseInt(item.min_stock);
            return stock > 0 && stock <= minStock;
        });
    } else if (currentFilter === 'OUT') {
        baseData = inventoryData.filter(item => parseInt(item.current_stock) === 0);
    }
    
    filteredData = baseData.filter(item => 
        item.sku.toLowerCase().includes(query) || 
        item.item_name.toLowerCase().includes(query) ||
        item.supplier_name.toLowerCase().includes(query)
    );
    
    renderInventoryTable(filteredData);
    console.log('✅ Search completed -', filteredData.length, 'results');
}

// ========================================
// INIT FUNCTION
// ========================================
function init_inventory() {
    console.log('🚀 Init Inventory Page v1.2 (Strict Approved Filter)');
    console.log('   → Only showing items with is_approved = TRUE');
    console.log('   → PENDING and REJECTED items excluded');
    
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
window.filterInventory = filterInventory;
window.searchInventory = searchInventory;

console.log('✅ Inventory Module v1.2 loaded (Strict Approved Filter)');
console.log('   Exposed functions:', {
    init_inventory: typeof window.init_inventory,
    loadInventoryData: typeof window.loadInventoryData,
    filterInventory: typeof window.filterInventory,
    searchInventory: typeof window.searchInventory
});