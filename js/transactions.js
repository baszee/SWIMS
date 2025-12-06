/**
 * =========================================================
 * TRANSACTIONS.JS - COMPLETE FIX VERSION 4.0
 * Fix: Duplikasi fungsi, memory leak, autocomplete sync
 * =========================================================
 */

// Global state untuk cleanup
let activeEventListeners = {
    barangMasuk: [],
    barangKeluar: []
};

// ========================================
// HELPER: Render Staff History
// ========================================
async function renderStaffHistory(type, targetDivId) {
    const historyDiv = document.getElementById(targetDivId);
    if (!historyDiv) return;

    historyDiv.innerHTML = '<p>Memuat riwayat...</p>';
    
    try {
        const response = await fetch(`api/transactions.php?action=my_history&type=${type}`);
        const data = await response.json();

        if (!data.success) {
            historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Gagal: ${data.message}</p>`;
            return;
        }

        if (data.data.length === 0) {
            historyDiv.innerHTML = `<p>Belum ada riwayat transaksi ${type}.</p>`;
            return;
        }

        let tableHtml = '<table class="table"><thead><tr>';
        tableHtml += '<th>Kode</th><th>Item</th><th>Qty</th><th>Status</th><th>Approver</th><th>Tanggal</th></tr></thead><tbody>';
        
        data.data.forEach(t => {
            let statusBadge;
            if (t.status === 'APPROVED') {
                statusBadge = '<span class="badge badge-success">APPROVED</span>';
            } else if (t.status === 'REJECTED') {
                statusBadge = '<span class="badge badge-danger">REJECTED</span>';
            } else {
                statusBadge = '<span class="badge badge-warning">PENDING</span>';
            }
            
            tableHtml += `
                <tr>
                    <td>${t.transaction_code}</td>
                    <td>${t.item_name} (${t.sku})</td>
                    <td>${t.quantity} ${t.unit}</td>
                    <td>${statusBadge}</td>
                    <td>${t.approver_name ?? '-'}</td>
                    <td>${t.request_date.substring(0, 10)}</td>
                </tr>
            `;
        });

        historyDiv.innerHTML = tableHtml + '</tbody></table>';

    } catch (error) {
        historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Error: ${error.message}</p>`;
        console.error('Staff history error:', error);
    }
}

// ========================================
// HELPER: Autocomplete Item
// ========================================
async function autocompleteItem(supplierId, query) {
    if (!supplierId || query.length < 2) return [];

    try {
        const response = await fetch(`api/items.php?action=search&supplier_id=${supplierId}&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Autocomplete error:', error);
        return [];
    }
}

// ========================================
// CLEANUP: Remove Event Listeners
// ========================================
function cleanupEventListeners(type) {
    if (activeEventListeners[type] && activeEventListeners[type].length > 0) {
        activeEventListeners[type].forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        activeEventListeners[type] = [];
    }
}

// ========================================
// INIT: BARANG MASUK (FIXED)
// ========================================
function init_barang_masuk() {
    console.log('🚀 Init Barang Masuk v4.0');
    
    cleanupEventListeners('barangMasuk');
    
    const form = document.getElementById('formBarangMasuk');
    if (!form) {
        console.error('❌ Form tidak ditemukan!');
        return;
    }
    
    const supplierSelect = document.getElementById('bm_supplier_id');
    const skuInput = document.getElementById('bm_sku_input');
    const nameInput = document.getElementById('bm_name_input');
    const skuResults = document.getElementById('autocompleteResultsSKU');
    const nameResults = document.getElementById('autocompleteResultsName');
    const skuInfo = document.getElementById('skuInfo');
    const nameInfo = document.getElementById('nameInfo');
    
    let selectedItemId = null;
    let selectedSupplierId = null;
    let isNewItem = false;

    // Populate Supplier
    supplierSelect.innerHTML = '<option value="">-- Pilih Klien --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    // Reset Item Selection
    const resetItemSelection = (clearInputs = false) => {
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null;
        isNewItem = true;
        
        if (clearInputs) {
            skuInput.value = '';
            nameInput.value = '';
        }
        
        if (skuInfo) skuInfo.textContent = 'Ketik untuk mencari atau input baru';
        if (nameInfo) nameInfo.textContent = 'Ketik untuk mencari atau input baru';
    };
    
    // Select Existing Item
    const selectExistingItem = (item) => {
        document.getElementById('bm_item_id').value = item.id;
        selectedItemId = item.id;
        isNewItem = false;
        
        skuInput.value = item.sku;
        nameInput.value = item.name;
        document.getElementById('bm_unit').value = item.unit;
        
        if (skuInfo) skuInfo.innerHTML = `✅ Item ID: ${item.id} | Stok: ${item.current_stock}`;
        if (nameInfo) nameInfo.innerHTML = `✅ Item ditemukan`;
        
        if (skuResults) skuResults.style.display = 'none';
        if (nameResults) nameResults.style.display = 'none';
    };
    
    // EVENT: Supplier Change
    const handleSupplierChange = function() {
        selectedSupplierId = this.value;
        
        if (selectedSupplierId) {
            skuInput.disabled = false;
            nameInput.disabled = false;
            skuInput.placeholder = "Ketik SKU...";
            nameInput.placeholder = "Ketik Nama...";
        } else {
            skuInput.disabled = true;
            nameInput.disabled = true;
            skuInput.placeholder = "Pilih Supplier dahulu";
            nameInput.placeholder = "Pilih Supplier dahulu";
        }
        
        resetItemSelection(true);
        if (skuResults) skuResults.style.display = 'none';
        if (nameResults) nameResults.style.display = 'none';
    };
    
    supplierSelect.addEventListener('change', handleSupplierChange);
    activeEventListeners.barangMasuk.push({ element: supplierSelect, event: 'change', handler: handleSupplierChange });
    
    // EVENT: SKU Input
    const handleSkuInput = async (e) => {
        const query = e.target.value.trim();
        
        if (selectedItemId) resetItemSelection(false);
        
        if (!skuResults) return;
        skuResults.innerHTML = '';
        
        if (!selectedSupplierId || query.length < 2) {
            skuResults.style.display = 'none';
            if (skuInfo) skuInfo.textContent = query.length > 0 ? 'Ketik min 2 karakter' : 'Ketik untuk mencari';
            return;
        }

        const results = await autocompleteItem(selectedSupplierId, query);
        
        if (results.length > 0) {
            results.forEach(item => {
                const el = document.createElement('div');
                el.className = 'autocomplete-item';
                el.innerHTML = `<strong>${item.sku}</strong> - ${item.name} <span style="float:right;">Stok: ${item.current_stock}</span>`;
                el.onclick = () => selectExistingItem(item);
                skuResults.appendChild(el);
            });
            skuResults.style.display = 'block';
            if (skuInfo) skuInfo.innerHTML = '🔍 Pilih dari hasil';
        } else {
            skuResults.innerHTML = '<div class="autocomplete-item disabled">Tidak ditemukan. Input manual untuk item baru.</div>';
            skuResults.style.display = 'block';
            if (skuInfo) skuInfo.innerHTML = '🆕 Item baru - lengkapi form';
            isNewItem = true;
        }
    };
    
    skuInput.addEventListener('input', handleSkuInput);
    activeEventListeners.barangMasuk.push({ element: skuInput, event: 'input', handler: handleSkuInput });
    
    // EVENT: Name Input
    const handleNameInput = async (e) => {
        const query = e.target.value.trim();
        
        if (selectedItemId) resetItemSelection(false);
        
        if (!nameResults) return;
        nameResults.innerHTML = '';
        
        if (!selectedSupplierId || query.length < 2) {
            nameResults.style.display = 'none';
            if (nameInfo) nameInfo.textContent = query.length > 0 ? 'Ketik min 2 karakter' : 'Ketik untuk mencari';
            return;
        }

        const results = await autocompleteItem(selectedSupplierId, query);
        
        if (results.length > 0) {
            results.forEach(item => {
                const el = document.createElement('div');
                el.className = 'autocomplete-item';
                el.innerHTML = `<strong>${item.name}</strong> - ${item.sku} <span style="float:right;">Stok: ${item.current_stock}</span>`;
                el.onclick = () => selectExistingItem(item);
                nameResults.appendChild(el);
            });
            nameResults.style.display = 'block';
            if (nameInfo) nameInfo.innerHTML = '🔍 Pilih dari hasil';
        } else {
            nameResults.innerHTML = '<div class="autocomplete-item disabled">Tidak ditemukan. Input manual untuk item baru.</div>';
            nameResults.style.display = 'block';
            if (nameInfo) nameInfo.innerHTML = '🆕 Item baru - lengkapi form';
            isNewItem = true;
        }
    };
    
    nameInput.addEventListener('input', handleNameInput);
    activeEventListeners.barangMasuk.push({ element: nameInput, event: 'input', handler: handleNameInput });
    
    // EVENT: Close dropdown on outside click
    const handleDocumentClick = (e) => {
        const skuInputExists = document.getElementById('bm_sku_input');
        const nameInputExists = document.getElementById('bm_name_input');
        const skuResultsExists = document.getElementById('autocompleteResultsSKU');
        const nameResultsExists = document.getElementById('autocompleteResultsName');
        
        if (skuInputExists && skuResultsExists) {
            if (!skuInputExists.contains(e.target) && !skuResultsExists.contains(e.target)) {
                skuResultsExists.style.display = 'none';
            }
        }
        
        if (nameInputExists && nameResultsExists) {
            if (!nameInputExists.contains(e.target) && !nameResultsExists.contains(e.target)) {
                nameResultsExists.style.display = 'none';
            }
        }
    };
    
    document.addEventListener('click', handleDocumentClick);
    activeEventListeners.barangMasuk.push({ element: document, event: 'click', handler: handleDocumentClick });
    
    // EVENT: Form Submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const sku = skuInput.value.trim();
        const name = nameInput.value.trim();
        const unit = document.getElementById('bm_unit').value;
        const qty = parseInt(document.getElementById('bm_qty').value);
        const note = document.getElementById('bm_note').value;
        
        if (!selectedSupplierId) {
            showMessageModal('Validasi', 'Pilih Supplier!', false);
            return;
        }
        
        if (!sku || !name) {
            showMessageModal('Validasi', 'SKU dan Nama wajib diisi!', false);
            return;
        }
        
        showLoadingModal('Memproses...');
        
        try {
            if (selectedItemId) {
                // CASE 1: Item existing
                const payload = {
                    type: 'IN',
                    item_id: selectedItemId,
                    quantity: qty,
                    note: note,
                    supplier_id: selectedSupplierId
                };
                
                const response = await fetch('api/transactions.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (data.success) {
                    showMessageModal('✅ Sukses!', data.message, false);
                    form.reset();
                    resetItemSelection(true);
                    renderStaffHistory('IN', 'riwayatMasukPanel');
                } else {
                    showMessageModal('❌ Gagal!', data.message, false);
                }
            } else {
                // CASE 2: Item baru
                const itemPayload = {
                    sku: sku,
                    name: name,
                    unit: unit,
                    supplier_id: selectedSupplierId,
                    min_stock: 10,
                    current_stock: 0
                };
                
                const itemResponse = await fetch('api/items.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(itemPayload)
                });
                
                const itemData = await itemResponse.json();
                
                if (!itemData.success) {
                    showMessageModal('❌ Gagal!', 'Gagal daftar item: ' + itemData.message, false);
                    return;
                }
                
                const newItemId = itemData.data.id;
                
                const transPayload = {
                    type: 'IN',
                    item_id: newItemId,
                    quantity: qty,
                    note: note,
                    supplier_id: selectedSupplierId
                };
                
                const transResponse = await fetch('api/transactions.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(transPayload)
                });
                
                const transData = await transResponse.json();
                
                if (transData.success) {
                    showMessageModal('✅ Sukses!', `Item "${name}" didaftarkan. Status: PENDING.`, false);
                    form.reset();
                    resetItemSelection(true);
                    loadMasterData();
                    renderStaffHistory('IN', 'riwayatMasukPanel');
                } else {
                    showMessageModal('⚠️ Warning', `Item OK tapi transaksi gagal: ${transData.message}`, false);
                }
            }
            
        } catch (error) {
            showMessageModal('Error', 'Gagal koneksi: ' + error.message, false);
            console.error('Transaction error:', error);
        } finally {
            hideLoadingModal();
        }
    };
    
    form.addEventListener('submit', handleFormSubmit);
    activeEventListeners.barangMasuk.push({ element: form, event: 'submit', handler: handleFormSubmit });
    
    renderStaffHistory('IN', 'riwayatMasukPanel');
    console.log('✅ Barang Masuk initialized');
}

// ========================================
// INIT: BARANG KELUAR (FIXED)
// ========================================
function init_barang_keluar() {
    console.log('🚀 Init Barang Keluar v4.0');
    
    cleanupEventListeners('barangKeluar');
    
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bk_supplier_id');
    const itemSelect = document.getElementById('bk_item_id');
    const infoDiv = document.getElementById('itemStockInfo');

    supplierSelect.innerHTML = '<option value="">-- Semua Klien --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    let allItems = [...masterDataCache.items];
    
    const populateItemDropdown = (supplierId = '') => {
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        if (infoDiv) infoDiv.textContent = 'Stok: -';
        
        const filteredItems = allItems.filter(item => {
            return !supplierId || item.supplier_id == supplierId;
        });

        filteredItems.forEach(item => {
            itemSelect.innerHTML += `<option value="${item.id}" data-stock="${item.current_stock}" data-unit="${item.unit}">${item.sku} - ${item.name} (Stok: ${item.current_stock})</option>`;
        });
        
        document.getElementById('bk_qty').max = null;
    };

    const updateStockInfo = () => {
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        
        if (selectedOption && selectedOption.value && infoDiv) {
            const stock = selectedOption.getAttribute('data-stock');
            const unit = selectedOption.getAttribute('data-unit');
            infoDiv.innerHTML = `Stok Tersedia: <b>${stock} ${unit}</b>`;
            document.getElementById('bk_qty').max = stock;
        } else {
            if (infoDiv) infoDiv.textContent = 'Stok: -';
            document.getElementById('bk_qty').max = null;
        }
    };

    const handleSupplierChange = function() {
        populateItemDropdown(this.value);
        updateStockInfo();
    };
    
    const handleItemChange = () => updateStockInfo();

    supplierSelect.addEventListener('change', handleSupplierChange);
    itemSelect.addEventListener('change', handleItemChange);
    
    activeEventListeners.barangKeluar.push({ element: supplierSelect, event: 'change', handler: handleSupplierChange });
    activeEventListeners.barangKeluar.push({ element: itemSelect, event: 'change', handler: handleItemChange });
    
    populateItemDropdown('');
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const selectedItemId = document.getElementById('bk_item_id').value;
        const quantity = parseInt(document.getElementById('bk_qty').value);
        const recipientName = document.getElementById('bk_recipient_name').value.trim();
        const recipientAddress = document.getElementById('bk_recipient_address').value.trim();
        const note = document.getElementById('bk_note').value;

        const selectedItemOption = itemSelect.options[itemSelect.selectedIndex];
        const availableStock = selectedItemOption ? parseInt(selectedItemOption.getAttribute('data-stock')) : 0;

        if (!selectedItemId || !recipientName || !recipientAddress || quantity <= 0) {
             showMessageModal('Validasi', 'Semua field wajib diisi!', false);
             return;
        }
        if (quantity > availableStock) {
             showMessageModal('Validasi', `Qty (${quantity}) > Stok (${availableStock})`, false);
             return;
        }
        
        const payload = {
            type: 'OUT',
            item_id: selectedItemId,
            quantity: quantity,
            recipient_name: recipientName,
            recipient_address: recipientAddress,
            note: note
        };
        
        showLoadingModal('Mengajukan...');

        try {
            const response = await fetch('api/transactions.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                loadMasterData().then(() => {
                    populateItemDropdown(supplierSelect.value);
                    updateStockInfo();
                    renderStaffHistory('OUT', 'riwayatKeluarPanel');
                });
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error', 'Koneksi gagal: ' + error.message, false);
            console.error('Transaction error:', error);
        } finally {
            hideLoadingModal();
        }
    };
    
    form.addEventListener('submit', handleFormSubmit);
    activeEventListeners.barangKeluar.push({ element: form, event: 'submit', handler: handleFormSubmit });

    renderStaffHistory('OUT', 'riwayatKeluarPanel');
    console.log('✅ Barang Keluar initialized');
}

// ========================================
// INIT: Request Item
// ========================================
function init_request_item() {
    loadMasterData().then(() => {
        if (typeof loadRequestHistory === 'function') {
            loadRequestHistory();
        }
    });
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.renderStaffHistory = renderStaffHistory;
window.autocompleteItem = autocompleteItem;
window.init_barang_masuk = init_barang_masuk;
window.init_barang_keluar = init_barang_keluar;
window.init_request_item = init_request_item;

console.log('✅ Transactions Module v4.0 loaded (FIXED)');