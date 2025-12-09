/**
 * =========================================================
 * INVENTORY.JS - INVENTORY MODULE
 * Version: 1.0 - Stock management page
 * =========================================================
 */

console.log('📦 INVENTORY MODULE v1.0 - Loading...');

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
    console.log('📊 Loading inventory data with transaction status...');
    
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
        // Fetch items data
        console.log('📡 Step 1: Fetching items...');
        const itemsResponse = await fetch('api/items.php?action=available');
        
        if (!itemsResponse.ok) {
            throw new Error(`HTTP ${itemsResponse.status}: ${itemsResponse.statusText}`);
        }
        
        const itemsData = await itemsResponse.json();
        console.log('✅ Items data received:', itemsData.data?.length, 'items');
        
        if (!itemsData.success || !itemsData.data || itemsData.data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px;">
                    <p style="font-size:3rem; margin:0;">📦</p>
                    <p style="color:var(--muted); font-weight:600;">Belum ada data inventaris</p>
                    <p class="small">Item akan muncul setelah ada transaksi yang approved</p>
                    <button class="btn primary btn-sm" onclick="loadInventoryData()">🔄 Coba Lagi</button>
                </div>
            `;
            updateSummary([]);
            return;
        }
        
        // Fetch transaction history ONLY for Supervisor/Owner
        let itemStatusMap = {};
        
        if (userRole === 'supervisor' || userRole === 'owner') {
            console.log('📡 Step 2: Fetching transaction history (Supervisor/Owner only)...');
            
            try {
                const historyResponse = await fetch('api/report.php?action=history');
                
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    console.log('✅ Transaction history received:', historyData.data?.length, 'transactions');
                    
                    if (historyData.success && historyData.data) {
                        // Sort by most recent first
                        const sortedTransactions = historyData.data.sort((a, b) => 
                            new Date(b.request_date) - new Date(a.request_date)
                        );
                        
                        // Get latest transaction status for each item (IN transactions only)
                        sortedTransactions.forEach(trx => {
                            if (trx.type === 'IN' && !itemStatusMap[trx.item_id]) {
                                itemStatusMap[trx.item_id] = {
                                    status: trx.status,
                                    transaction_code: trx.transaction_code,
                                    approval_date: trx.approval_date
                                };
                            }
                        });
                    }
                }
            } catch (historyError) {
                console.warn('⚠️ Could not fetch transaction history:', historyError);
            }
        } else {
            console.log('ℹ️ Staff role - using item is_approved status directly');
        }
        
        console.log('📊 Item status map:', itemStatusMap);
        
        // Normalize data and add transaction status
        inventoryData = itemsData.data.map(item => {
            let actualStatus = 'PENDING'; // Default
            
            if (userRole === 'supervisor' || userRole === 'owner') {
                // For Supervisor/Owner: Use transaction status
                const latestTrx = itemStatusMap[item.id];
                if (latestTrx) {
                    actualStatus = latestTrx.status; // APPROVED, REJECTED, or PENDING
                }
            } else {
                // For Staff: Use item.is_approved from database
                actualStatus = item.is_approved == 1 ? 'APPROVED' : 'PENDING';
            }
            
            return {
                id: item.id,
                sku: item.sku,
                item_name: item.name || item.item_name,
                current_stock: item.current_stock,
                unit: item.unit,
                min_stock: item.min_stock || 10,
                supplier_name: item.supplier_name,
                is_approved: actualStatus === 'APPROVED' ? 1 : 0,
                transaction_status: actualStatus,
                latest_transaction: itemStatusMap[item.id] || null
            };
        });
        
        console.log('📦 Processed items with status:', inventoryData.slice(0, 3));
        
        filteredData = [...inventoryData];
        
        updateSummary(inventoryData);
        renderInventoryTable(filteredData);
        
        console.log('✅ Inventory rendered successfully');
        
    } catch (error) {
        console.error('❌ Load inventory error:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--danger); font-weight:600;">❌ Error Jaringan</p>
                <p class="small">${error.message}</p>
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
    const lowStockCount = data.filter(item => 
        item.is_approved == 1 && 
        parseInt(item.current_stock) <= parseInt(item.min_stock) &&
        parseInt(item.current_stock) > 0
    ).length;
    const approvedItems = data.filter(item => item.is_approved == 1).length;
    
    const totalItemsEl = document.getElementById('totalItems');
    const totalStockEl = document.getElementById('totalStock');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const approvedItemsEl = document.getElementById('approvedItems');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
    if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString();
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (approvedItemsEl) approvedItemsEl.textContent = approvedItems;
    
    console.log('📊 Summary updated:', {
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
                    <th>Status Item</th>
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
        
        // Item status based on LATEST TRANSACTION STATUS
        let approvalBadge;
        const trxStatus = item.transaction_status || 'PENDING';
        
        if (trxStatus === 'APPROVED') {
            approvalBadge = '<span class="badge badge-success">✅ APPROVED</span>';
        } else if (trxStatus === 'REJECTED') {
            approvalBadge = '<span class="badge badge-danger">❌ REJECTED</span>';
        } else {
            approvalBadge = '<span class="badge badge-warning">⏳ PENDING</span>';
        }
        
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
    
    console.log('🔍 Filtering by:', filterType);
    
    const filterStatus = document.getElementById('filterStatus');
    
    // Apply filter
    if (filterType === 'ALL') {
        filteredData = [...inventoryData];
        if (filterStatus) filterStatus.textContent = 'Menampilkan: Semua Item';
    } else if (filterType === 'LOW') {
        filteredData = inventoryData.filter(item => {
            const stock = parseInt(item.current_stock);
            const minStock = parseInt(item.min_stock);
            return item.is_approved == 1 && stock > 0 && stock <= minStock;
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
    console.log('✅ Filter applied, showing', filteredData.length, 'items');
}

// ========================================
// SEARCH INVENTORY
// ========================================
function searchInventory() {
    const searchInput = document.getElementById('searchInventory');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    if (!query) {
        // Reset to current filter
        if (currentFilter === 'ALL') {
            filteredData = [...inventoryData];
        } else if (currentFilter === 'LOW') {
            filteredData = inventoryData.filter(item => {
                const stock = parseInt(item.current_stock);
                const minStock = parseInt(item.min_stock);
                return item.is_approved == 1 && stock > 0 && stock <= minStock;
            });
        } else if (currentFilter === 'OUT') {
            filteredData = inventoryData.filter(item => parseInt(item.current_stock) === 0);
        }
    } else {
        // Search within current filter
        let baseData = [];
        if (currentFilter === 'ALL') {
            baseData = [...inventoryData];
        } else if (currentFilter === 'LOW') {
            baseData = inventoryData.filter(item => {
                const stock = parseInt(item.current_stock);
                const minStock = parseInt(item.min_stock);
                return item.is_approved == 1 && stock > 0 && stock <= minStock;
            });
        } else if (currentFilter === 'OUT') {
            baseData = inventoryData.filter(item => parseInt(item.current_stock) === 0);
        }
        
        filteredData = baseData.filter(item => 
            item.sku.toLowerCase().includes(query) || 
            item.item_name.toLowerCase().includes(query) ||
            item.supplier_name.toLowerCase().includes(query)
        );
    }
    
    renderInventoryTable(filteredData);
}

// ========================================
// INIT FUNCTION
// ========================================
function init_inventory() {
    console.log('🚀 Init Inventory Page v1.0');
    console.log('✅ All functions ready');
    
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

console.log('✅ Inventory Module v1.0 loaded');
console.log('   Exposed functions:', {
    init_inventory: typeof window.init_inventory,
    loadInventoryData: typeof window.loadInventoryData,
    filterInventory: typeof window.filterInventory,
    searchInventory: typeof window.searchInventory
});