/**
 * =========================================================
 * TRANSACTIONS.JS - FIXED VERSION 5.1
 * Fix: Dropdown filter tidak berfungsi + Autocomplete error
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
// INIT: BARANG MASUK (FIXED AUTOCOMPLETE)
// ========================================
function init_barang_masuk() {
    console.log('🚀 Init Barang Masuk v5.1 - FIXED AUTOCOMPLETE');
    
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
        
        console.log('🔍 Supplier changed to:', selectedSupplierId);
        
        if (selectedSupplierId) {
            skuInput.disabled = false;
            nameInput.disabled = false;
            skuInput.placeholder = "Ketik SKU...";
            nameInput.placeholder = "Ketik Nama...";
            
            if (skuInfo) skuInfo.textContent = 'Ketik min 2 karakter untuk mencari';
            if (nameInfo) nameInfo.textContent = 'Ketik min 2 karakter untuk mencari';
        } else {
            skuInput.disabled = true;
            nameInput.disabled = true;
            skuInput.placeholder = "Pilih Supplier dahulu";
            nameInput.placeholder = "Pilih Supplier dahulu";
            
            if (skuInfo) skuInfo.textContent = 'Pilih Supplier terlebih dahulu';
            if (nameInfo) nameInfo.textContent = 'Pilih Supplier terlebih dahulu';
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
        
        if (!selectedSupplierId) {
            skuResults.style.display = 'none';
            if (skuInfo) skuInfo.textContent = 'Pilih Supplier terlebih dahulu';
            return;
        }
        
        if (query.length < 2) {
            skuResults.style.display = 'none';
            if (skuInfo) skuInfo.textContent = 'Ketik min 2 karakter';
            return;
        }

        console.log('🔍 Searching SKU:', query, 'for supplier:', selectedSupplierId);
        
        const results = await autocompleteItem(selectedSupplierId, query);
        
        console.log('📦 Search results:', results);
        
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
        
        if (!selectedSupplierId) {
            nameResults.style.display = 'none';
            if (nameInfo) nameInfo.textContent = 'Pilih Supplier terlebih dahulu';
            return;
        }
        
        if (query.length < 2) {
            nameResults.style.display = 'none';
            if (nameInfo) nameInfo.textContent = 'Ketik min 2 karakter';
            return;
        }

        console.log('🔍 Searching Name:', query, 'for supplier:', selectedSupplierId);
        
        const results = await autocompleteItem(selectedSupplierId, query);
        
        console.log('📦 Search results:', results);
        
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
            } 
            else {
                const payload = {
                    type: 'IN',
                    supplier_id: selectedSupplierId,
                    sku: sku,
                    name: name,
                    unit: unit,
                    quantity: qty,
                    note: note
                };
                
                console.log('Sending new item payload:', payload);
                
                const response = await fetch('api/transactions.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                console.log('Response:', data);
                
                if (data.success) {
                    showMessageModal('✅ Sukses!', data.message, false);
                    form.reset();
                    resetItemSelection(true);
                    await loadMasterData();
                    renderStaffHistory('IN', 'riwayatMasukPanel');
                } else {
                    showMessageModal('❌ Gagal!', data.message, false);
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
    console.log('✅ Barang Masuk initialized v5.1');
}

// ========================================
// INIT: BARANG KELUAR (FIXED FILTER)
// ========================================
function init_barang_keluar() {
    console.log('🚀 Init Barang Keluar v5.1 - FIXED FILTER');
    
    cleanupEventListeners('barangKeluar');
    
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bk_supplier_id');
    const itemSelect = document.getElementById('bk_item_id');
    const infoDiv = document.getElementById('itemStockInfo');

    // Populate Supplier Filter
    supplierSelect.innerHTML = '<option value="">-- Semua Klien --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    let allItems = [...masterDataCache.items];
    
    // ✅ FIX: Populate dropdown dengan filter supplier
    const populateItemDropdown = (supplierId = '') => {
        console.log('📦 Populating items with supplier filter:', supplierId);
        
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        if (infoDiv) {
            document.getElementById('stockText').textContent = 'Pilih Supplier dulu untuk filter item';
        }
        
        // ✅ FIX: Jika tidak ada supplier dipilih, JANGAN tampilkan item
        if (!supplierId) {
            console.log('⚠️ No supplier selected - showing empty dropdown');
            if (infoDiv) {
                document.getElementById('stockText').innerHTML = '⚠️ Pilih Supplier terlebih dahulu untuk melihat item';
                infoDiv.style.background = '#fef3c7';
                infoDiv.style.borderColor = '#f59e0b';
            }
            return;
        }
        
        const filteredItems = allItems.filter(item => item.supplier_id == supplierId);

        console.log('   → Filtered items count:', filteredItems.length);
        
        if (filteredItems.length === 0) {
            itemSelect.innerHTML = '<option value="">-- Tidak ada item untuk supplier ini --</option>';
            if (infoDiv) {
                document.getElementById('stockText').innerHTML = '⚠️ Supplier ini belum memiliki item yang approved';
                infoDiv.style.background = '#fee2e2';
                infoDiv.style.borderColor = '#ef4444';
            }
            return;
        }

        filteredItems.forEach(item => {
            const stockLabel = item.current_stock > 0 ? `Stok: ${item.current_stock}` : '⚠️ Stok Habis';
            const disabled = item.current_stock <= 0 ? 'disabled' : '';
            
            itemSelect.innerHTML += `
                <option value="${item.id}" 
                        data-stock="${item.current_stock}" 
                        data-unit="${item.unit}"
                        data-name="${item.name}"
                        data-sku="${item.sku}"
                        ${disabled}>
                    ${item.sku} - ${item.name} (${stockLabel})
                </option>
            `;
        });
        
        if (infoDiv) {
            document.getElementById('stockText').textContent = 'Pilih item untuk melihat stok';
            infoDiv.style.background = '#f0f9ff';
            infoDiv.style.borderColor = '#3b82f6';
        }
        
        console.log('✅ Dropdown populated successfully');
    };
    
    const updateStockInfo = () => {
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const stockText = document.getElementById('stockText');
        const qtyInput = document.getElementById('bk_qty');
        
        if (selectedOption && selectedOption.value && infoDiv) {
            const stock = parseInt(selectedOption.getAttribute('data-stock'));
            const unit = selectedOption.getAttribute('data-unit');
            const name = selectedOption.getAttribute('data-name');
            const sku = selectedOption.getAttribute('data-sku');
            
            if (stock > 0) {
                stockText.innerHTML = `
                    ✅ <strong>${name}</strong> (${sku})<br>
                    Stok Tersedia: <strong>${stock} ${unit}</strong>
                `;
                infoDiv.style.display = 'block';
                infoDiv.style.background = '#f0f9ff';
                infoDiv.style.borderColor = '#3b82f6';
                
                qtyInput.max = stock;
                qtyInput.value = '';
                qtyInput.disabled = false;
            } else {
                stockText.innerHTML = `⚠️ <strong>${name}</strong> stok habis!`;
                infoDiv.style.display = 'block';
                infoDiv.style.background = '#fee2e2';
                infoDiv.style.borderColor = '#ef4444';
                
                qtyInput.max = 0;
                qtyInput.value = '';
                qtyInput.disabled = true;
            }
        } else {
            if (infoDiv) {
                infoDiv.style.display = 'block';
                stockText.textContent = 'Pilih item untuk melihat stok';
                infoDiv.style.background = '#f0f9ff';
                infoDiv.style.borderColor = '#3b82f6';
            }
            qtyInput.max = null;
            qtyInput.disabled = false;
        }
        
        document.getElementById('qtyWarning').style.display = 'none';
    };

    const handleSupplierChange = function() {
        console.log('🔍 Supplier filter changed to:', this.value);
        populateItemDropdown(this.value);
        updateStockInfo();
    };
    
    const handleItemChange = () => updateStockInfo();

    supplierSelect.addEventListener('change', handleSupplierChange);
    itemSelect.addEventListener('change', handleItemChange);
    
    activeEventListeners.barangKeluar.push({ element: supplierSelect, event: 'change', handler: handleSupplierChange });
    activeEventListeners.barangKeluar.push({ element: itemSelect, event: 'change', handler: handleItemChange });
    
    // ✅ INITIAL STATE: Empty dropdown until supplier selected
    console.log('📍 Initial state: Empty dropdown (waiting for supplier selection)');
    itemSelect.innerHTML = '<option value="">-- Pilih Supplier dulu --</option>';
    if (infoDiv) {
        document.getElementById('stockText').innerHTML = '⚠️ Pilih Supplier terlebih dahulu';
        infoDiv.style.background = '#fef3c7';
        infoDiv.style.borderColor = '#f59e0b';
    }
    
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
             showMessageModal('Validasi Stok', 
                `Jumlah yang diminta (${quantity}) melebihi stok tersedia (${availableStock}).`, 
                false);
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
        
        console.log('📦 Sending payload:', payload);
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';
        
        showLoadingModal('Mengajukan Permintaan Barang Keluar...');

        try {
            const response = await fetch('api/transactions.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('📦 Response:', data);
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                
                await loadMasterData();
                
                // Reset to empty state
                itemSelect.innerHTML = '<option value="">-- Pilih Supplier dulu --</option>';
                if (infoDiv) {
                    document.getElementById('stockText').innerHTML = '⚠️ Pilih Supplier terlebih dahulu';
                    infoDiv.style.background = '#fef3c7';
                    infoDiv.style.borderColor = '#f59e0b';
                }
                
                renderStaffHistory('OUT', 'riwayatKeluarPanel');
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi: ' + error.message, false);
            console.error('Transaction submit error:', error);
        } finally {
            hideLoadingModal();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request Barang Keluar';
        }
    };
    
    form.addEventListener('submit', handleFormSubmit);
    activeEventListeners.barangKeluar.push({ element: form, event: 'submit', handler: handleFormSubmit });

    renderStaffHistory('OUT', 'riwayatKeluarPanel');
    console.log('✅ Barang Keluar initialized v5.1');
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

console.log('✅ Transactions Module v5.1 loaded (AUTOCOMPLETE + FILTER FIX)');