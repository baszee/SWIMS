/**
 * =========================================================
 * TRANSACTIONS.JS - TRANSACTIONS MODULE
 * Menangani logika untuk Barang Masuk/Keluar, Request Item, dan Manage Items.
 * =========================================================
 */

/**
 * Helper untuk merender riwayat transaksi Staff (IN/OUT)
 */
async function renderStaffHistory(type, targetDivId) {
    const historyDiv = document.getElementById(targetDivId);
    if (!historyDiv) return;

    historyDiv.innerHTML = '<p>Memuat riwayat...</p>';
    
    try {
        const response = await fetch(`api/transactions.php?action=my_history&type=${type}`);
        const data = await response.json();

        if (!data.success) {
            historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Gagal memuat riwayat: ${data.message}</p>`;
            return;
        }

        if (data.data.length === 0) {
            historyDiv.innerHTML = `<p>Anda belum memiliki riwayat transaksi ${type} terbaru.</p>`;
            return;
        }

        let tableHtml = '<table class="table"><thead><tr>';
        tableHtml += '<th>Kode Trans</th><th>Item (SKU)</th><th>Qty</th><th>Status</th><th>Approver</th><th>Tanggal</th></tr></thead><tbody>';
        
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
        historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Error saat memuat riwayat: ${error.message}</p>`;
        console.error('Staff history load error:', error);
    }
}

/**
 * Helper untuk mencari item (Autocomplete)
 */
async function autocompleteItem(supplierId, query) {
    if (!supplierId || query.length < 2) return [];

    try {
        const response = await fetch(`api/items.php?action=search&supplier_id=${supplierId}&q=${query}`);
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Autocomplete API failed:', error);
        return [];
    }
}


/* init_barang_masuk - Form Barang Masuk */
function init_barang_masuk(){
    const form = document.getElementById('formBarangMasuk');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bm_supplier_id');
    const skuInput = document.getElementById('bm_sku_input');
    const resultsDiv = document.getElementById('autocompleteResults');
    
    let selectedItemId = null;
    let selectedSupplierId = null;

    // Populate Dropdown Supplier (Menggunakan masterDataCache dari app.js)
    supplierSelect.innerHTML = '<option value="">-- Pilih Klien Pemilik Barang --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    // Fungsi reset item selection
    const resetItemSelection = (showInput = true) => {
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null;
        document.getElementById('itemInfo').innerHTML = `Status Item: -`;
        resultsDiv.style.display = 'none';
        if (showInput) skuInput.value = '';
    };

    // Fungsi saat item dipilih dari autocomplete
    const selectItem = (item) => {
        skuInput.value = `${item.sku} - ${item.name} (${item.unit})`;
        document.getElementById('bm_item_id').value = item.id;
        selectedItemId = item.id;
        document.getElementById('itemInfo').innerHTML = `Status Item: <b>APPROVED</b> | Unit: ${item.unit} | Stok Saat Ini: ${item.current_stock}`;
        resultsDiv.style.display = 'none';
    };

    // 1. Event Listener untuk perubahan Supplier
    skuInput.disabled = true; 
    skuInput.placeholder = "Pilih Supplier dahulu";
    
    supplierSelect.onchange = function() {
        selectedSupplierId = this.value;
        resetItemSelection();
        skuInput.disabled = !selectedSupplierId; 
        skuInput.placeholder = selectedSupplierId ? "Ketik SKU atau Nama Item..." : "Pilih Supplier dahulu";
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    };
    
    // 2. Event Listener untuk Autocomplete SKU
    skuInput.oninput = async (e) => {
        const query = e.target.value;
        // Reset ID, tapi jangan reset input text
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null; 
        
        resultsDiv.innerHTML = '';
        document.getElementById('itemInfo').innerHTML = `Status Item: Mencari...`;


        if (!selectedSupplierId || query.length < 2) {
             document.getElementById('itemInfo').innerHTML = `Status Item: -`;
             return;
        }

        const results = await autocompleteItem(selectedSupplierId, query);
        
        if (results.length > 0) {
            results.forEach(item => {
                const el = document.createElement('div');
                el.className = 'autocomplete-item';
                el.innerHTML = `<strong>${item.sku}</strong> - ${item.name} (${item.unit}) <span style="float:right; color:var(--muted)">Stok: ${item.current_stock}</span>`;
                el.onclick = () => selectItem(item);
                resultsDiv.appendChild(el);
            });
            resultsDiv.style.display = 'block';
            document.getElementById('itemInfo').innerHTML = `Status Item: **Pilih Item Ditemukan**`;

        } else {
             // LOGIC INPUT BARU (Jika tidak ada hasil, tawarkan opsi ajukan item baru)
             document.getElementById('itemInfo').innerHTML = `
                 Status Item: Item tidak ditemukan.<br>
                 <button class="btn btn-sm success" onclick="requestNewItem('${query}', event)" style="margin-top:5px;">+ Ajukan Item Baru (${query})</button>
             `;
             resultsDiv.style.display = 'none';
        }
    };
    
    // [LOGIC PENTING] Fungsi Ajukan Item Baru (Sesuai usulan Staff)
    window.requestNewItem = (skuQuery, e) => {
        // Stop event propagation to prevent multiple triggers
        if (e) e.stopPropagation();
        
        const supplierName = supplierSelect.options[supplierSelect.selectedIndex].textContent;
        
        showMessageModal('Ajukan Item Baru?', `Anda akan mengajukan Item Baru dengan SKU: <b>${skuQuery}</b> untuk Klien: <b>${supplierName}</b>. Item akan berstatus PENDING.`, true, async () => {
            showLoadingModal('Mengajukan Item Baru...');

            const payload = {
                sku: skuQuery,
                name: skuQuery, // Default nama sama dengan SKU
                unit: 'Pcs', // Default Unit
                supplier_id: selectedSupplierId,
                current_stock: 0,
            };
            
            try {
                // Gunakan POST ke API Items.php (yang akan membuatnya PENDING karena role=staff)
                const response = await fetch('api/items.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                
                if (data.success) {
                     showMessageModal('✅ Sukses!', `Permintaan Item Baru <b>${skuQuery}</b> berhasil diajukan! Item ini akan aktif setelah Supervisor menyetujuinya.`, false);
                     // Setelah sukses, item baru ini akan memiliki ID di DB, kita bisa reset form
                     form.reset();
                     resetItemSelection();
                } else {
                     showMessageModal('❌ Gagal!', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error Jaringan', 'Gagal mengajukan item baru.', false);
            } finally {
                hideLoadingModal();
            }
        });
    };


    // Tutup dropdown jika klik di luar
    document.addEventListener('click', (e) => {
        if (!skuInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });

    // 3. Event Listener untuk Form Submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        if (!selectedItemId) {
             showMessageModal('Validasi', 'Mohon cari dan pilih Item yang valid dari daftar saran.', false);
             return;
        }

        const payload = {
            type: 'IN',
            item_id: selectedItemId,
            quantity: parseInt(document.getElementById('bm_qty').value),
            note: document.getElementById('bm_note').value,
            supplier_id: selectedSupplierId 
        };
        
        showLoadingModal('Mengajukan Permintaan Barang Masuk...');

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
                resetItemSelection();
                // Muat ulang riwayat
                renderStaffHistory('IN', 'riwayatMasukPanel');
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi. Cek koneksi server Anda.', false);
            console.error('Transaction submit error:', error);
        } finally {
            hideLoadingModal();
        }
    };

    // Muat Riwayat Transaksi Masuk
    renderStaffHistory('IN', 'riwayatMasukPanel');
}


/* init_barang_keluar - Form Barang Keluar (FIX Filter Item) */
function init_barang_keluar(){
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bk_supplier_id');
    const itemSelect = document.getElementById('bk_item_id');
    const infoDiv = document.getElementById('itemStockInfo');

    // Populate Dropdown Supplier Filter (termasuk opsi 'Semua')
    supplierSelect.innerHTML = '<option value="">-- Tampilkan Semua Klien --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    let allItems = [...masterDataCache.items];
    
    // Fungsi untuk mengisi dropdown Item berdasarkan filter Supplier
    const populateItemDropdown = (supplierId = '') => {
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        infoDiv.textContent = 'Stok Saat Ini: -';
        
        // FIX: Filtering dilakukan di frontend menggunakan item.supplier_id
        const filteredItems = allItems.filter(item => {
            // Jika supplierId kosong, tampilkan semua item
            return !supplierId || item.supplier_id == supplierId;
        });

        filteredItems.forEach(item => {
            itemSelect.innerHTML += `<option value="${item.id}" data-stock="${item.current_stock}" data-unit="${item.unit}">${item.sku} - ${item.name} (Stok: ${item.current_stock})</option>`;
        });
        
        document.getElementById('bk_qty').max = null;
    }

    // Fungsi untuk menampilkan info stok saat item dipilih
    const updateStockInfo = () => {
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const stock = selectedOption.getAttribute('data-stock');
            const unit = selectedOption.getAttribute('data-unit');
            
            infoDiv.innerHTML = `Stok Tersedia: <b>${stock} ${unit}</b>`;
            
            document.getElementById('bk_qty').max = stock;
        } else {
            infoDiv.textContent = 'Stok Saat Ini: -';
            document.getElementById('bk_qty').max = null;
        }
    };

    // 1. Event Listener untuk perubahan Supplier (Filtering)
    supplierSelect.onchange = function() {
        populateItemDropdown(this.value);
        updateStockInfo();
    };

    // 2. Event Listener untuk perubahan Item
    itemSelect.onchange = updateStockInfo;
    
    // Muat dropdown item pertama kali (tanpa filter)
    populateItemDropdown(''); 
    
    // 3. Event Listener untuk Form Submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const selectedItemId = document.getElementById('bk_item_id').value;
        const quantity = parseInt(document.getElementById('bk_qty').value);
        const recipientName = document.getElementById('bk_recipient_name').value.trim();
        const recipientAddress = document.getElementById('bk_recipient_address').value.trim();
        const note = document.getElementById('bk_note').value;

        const selectedItemOption = itemSelect.options[itemSelect.selectedIndex];
        const availableStock = selectedItemOption ? parseInt(selectedItemOption.getAttribute('data-stock')) : 0;

        // Validasi Sisi Klien
        if (!selectedItemId || !recipientName || !recipientAddress || quantity <= 0) {
             showMessageModal('Validasi', 'Semua field wajib diisi dengan benar.', false);
             return;
        }
        if (quantity > availableStock) {
             showMessageModal('Validasi Stok', `Jumlah yang diminta (${quantity}) melebihi stok tersedia (${availableStock}).`, false);
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
        
        showLoadingModal('Mengajukan Permintaan Barang Keluar...');

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
                // Muat ulang data master (stok berubah setelah approval) dan riwayat
                loadMasterData().then(() => {
                    populateItemDropdown(supplierSelect.value);
                    updateStockInfo();
                    renderStaffHistory('OUT', 'riwayatKeluarPanel');
                });
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi. Cek koneksi server Anda.', false);
            console.error('Transaction submit error:', error);
        } finally {
            hideLoadingModal();
        }
    };

    // Muat Riwayat Transaksi Keluar
    renderStaffHistory('OUT', 'riwayatKeluarPanel');
}

/* init_request_item - Request Item Baru (Halaman Terpisah) */
function init_request_item(){
    loadMasterData().then(() => {
        if(typeof loadRequestHistory === 'function') {
            loadRequestHistory(); // Fungsi loadRequestHistory harus ada di sini atau di file lain
        }
    });
}

/* init_manage_items - Admin Manage Items */
function init_manage_items(){
    if(typeof loadItemList === 'function') {
        loadItemList(); // Fungsi loadItemList harus ada di sini atau di file lain
    }
}

/* init_notes - Notes Page */
function init_notes(){
    if(typeof loadNotesList === 'function') {
        loadNotesList(); // Fungsi loadNotesList harus ada di sini atau di file lain
    }
}

/* init_owner_report - Owner Report */
function init_owner_report(){
    if(document.getElementById('reportTabs') && typeof renderReport === 'function') {
        document.getElementById('reportTabs').querySelector('button:first-child').className = 'btn primary';
        renderReport('summary'); // Fungsi renderReport harus ada di sini atau di file lain
    }
}


// Expose init functions and helpers
window.renderStaffHistory = renderStaffHistory;
window.autocompleteItem = autocompleteItem;
window.init_barang_masuk = init_barang_masuk;
window.init_barang_keluar = init_barang_keluar;
window.init_request_item = init_request_item;
window.init_manage_items = init_manage_items;
window.init_notes = init_notes;
window.init_owner_report = init_owner_report;