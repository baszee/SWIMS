<div class="card">
  <div style="display: flex; align-items: center; margin-bottom: 5px;">
    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📤</span> Barang Keluar
    </h2>
  </div>
  
  <form id="formBarangKeluar">
    <!-- Dropdown Supplier (Filter) -->
    <label>Filter Item Berdasarkan Klien/Supplier (Opsional)</label>
    <select id="bk_supplier_id">
        <option value="">-- Tampilkan Semua Klien --</option>
        <!-- Options dimuat oleh JS -->
    </select>
    
    <!-- Dropdown Item -->
    <label>Pilih Item <span style="color:red;">*</span></label>
    <select id="bk_item_id" required>
        <option value="">-- Pilih Item --</option>
        <!-- Options dimuat dan difilter oleh JS -->
    </select>
    <div id="itemStockInfo" class="card" style="margin-top: 8px; padding: 10px; background: #f0f9ff; border-color: #3b82f6; display:none;">
        <p class="small" style="margin:0; color:#1e3a8a;" id="stockText"></p>
    </div>
    
    <label>Jumlah <span style="color:red;">*</span></label>
    <input id="bk_qty" type="number" min="1" required>
    <p class="small" id="qtyWarning" style="color:var(--danger); display:none; margin-top:5px;"></p>
    
    <!-- Field Penerima -->
    <label>Nama Penerima (Toko/Individu) <span style="color:red;">*</span></label>
    <input type="text" id="bk_recipient_name" required placeholder="Nama Toko atau Individu">

    <label>Alamat Penerima <span style="color:red;">*</span></label>
    <textarea id="bk_recipient_address" rows="3" required placeholder="Alamat lengkap pengiriman barang keluar..."></textarea>
    
    <label>Catatan</label>
    <textarea id="bk_note" rows="3" placeholder="Opsional: alasan pengambilan barang..."></textarea>
    
    <button class="btn primary" type="submit" id="submitBtn">Request Barang Keluar</button>
  </form>
  
  <div class="card" style="margin-top:16px;background:#dbeafe;border-color:#3b82f6;">
    <h4 style="margin-top:0;">📋 Catatan</h4>
    <p class="small" style="color:#1e3a8a;margin:0;">
        • Transaksi keluar disimpan sebagai <strong>PENDING</strong> sampai Supervisor approve<br>
        • Stok akan dikurangi <strong>saat approved</strong><br>
        • Pastikan jumlah tidak melebihi stok tersedia<br>
        • Filter Supplier untuk mempermudah pencarian item
    </p>
  </div>
</div>

<!-- Riwayat Transaksi Saya -->
<div class="card">
    <h3>Riwayat Transaksi Keluar Saya</h3>
    <div id="riwayatKeluarPanel">
        <p>Memuat riwayat transaksi...</p>
    </div>
</div>

<script>
    // ========================================
    // STATE & CACHED DATA
    // ========================================
    let currentFilteredItems = [];
    let selectedItemData = null;
    
    // ========================================
    // POPULATE ITEM DROPDOWN WITH FILTER
    // ========================================
    function populateItemDropdown(supplierId = '') {
        const itemSelect = document.getElementById('bk_item_id');
        const infoDiv = document.getElementById('itemStockInfo');
        
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        infoDiv.style.display = 'none';
        document.getElementById('qtyWarning').style.display = 'none';
        selectedItemData = null;
        
        // Filter items
        currentFilteredItems = masterDataCache.items.filter(item => {
            return !supplierId || item.supplier_id == supplierId;
        });

        if (currentFilteredItems.length === 0) {
            itemSelect.innerHTML = '<option value="">-- Tidak ada item tersedia --</option>';
            return;
        }

        // Sort by name
        currentFilteredItems.sort((a, b) => a.name.localeCompare(b.name));

        // Populate options
        currentFilteredItems.forEach(item => {
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
    }
    
    // ========================================
    // UPDATE STOCK INFO WHEN ITEM SELECTED
    // ========================================
    function updateStockInfo() {
        const itemSelect = document.getElementById('bk_item_id');
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const infoDiv = document.getElementById('itemStockInfo');
        const stockText = document.getElementById('stockText');
        const qtyInput = document.getElementById('bk_qty');
        
        if (selectedOption && selectedOption.value) {
            const stock = parseInt(selectedOption.getAttribute('data-stock'));
            const unit = selectedOption.getAttribute('data-unit');
            const name = selectedOption.getAttribute('data-name');
            const sku = selectedOption.getAttribute('data-sku');
            
            selectedItemData = {
                id: selectedOption.value,
                stock: stock,
                unit: unit,
                name: name,
                sku: sku
            };
            
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
            infoDiv.style.display = 'none';
            selectedItemData = null;
            qtyInput.max = null;
            qtyInput.disabled = false;
        }
        
        document.getElementById('qtyWarning').style.display = 'none';
    }
    
    // ========================================
    // VALIDATE QUANTITY INPUT
    // ========================================
    function validateQuantity() {
        const qtyInput = document.getElementById('bk_qty');
        const qtyWarning = document.getElementById('qtyWarning');
        const qty = parseInt(qtyInput.value);
        
        if (!selectedItemData || !qty) {
            qtyWarning.style.display = 'none';
            return true;
        }
        
        if (qty > selectedItemData.stock) {
            qtyWarning.textContent = `⚠️ Jumlah melebihi stok tersedia (max: ${selectedItemData.stock} ${selectedItemData.unit})`;
            qtyWarning.style.display = 'block';
            return false;
        }
        
        qtyWarning.style.display = 'none';
        return true;
    }
    
    // ========================================
    // INIT FUNCTION
    // ========================================
    window.init_barang_keluar = function() {
        const form = document.getElementById('formBarangKeluar');
        const supplierSelect = document.getElementById('bk_supplier_id');
        const itemSelect = document.getElementById('bk_item_id');
        const qtyInput = document.getElementById('bk_qty');

        // Populate Supplier Filter
        masterDataCache.suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        
        // Event: Supplier Filter Change
        supplierSelect.onchange = function() {
            populateItemDropdown(this.value);
            updateStockInfo();
        };

        // Event: Item Selection Change
        itemSelect.onchange = updateStockInfo;
        
        // Event: Quantity Input
        qtyInput.oninput = validateQuantity;
        
        // Initial load (all items)
        populateItemDropdown(''); 
        
        // ========================================
        // EVENT: Form Submit
        // ========================================
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            if (!selectedItemData) {
                showMessageModal('Validasi', 'Pilih item terlebih dahulu!', false);
                return;
            }
            
            const quantity = parseInt(document.getElementById('bk_qty').value);
            const recipientName = document.getElementById('bk_recipient_name').value.trim();
            const recipientAddress = document.getElementById('bk_recipient_address').value.trim();
            const note = document.getElementById('bk_note').value;

            // Validasi
            if (!recipientName || !recipientAddress || quantity <= 0) {
                showMessageModal('Validasi', 'Semua field wajib diisi dengan benar!', false);
                return;
            }
            
            if (quantity > selectedItemData.stock) {
                showMessageModal('Validasi Stok', 
                    `Jumlah yang diminta (${quantity}) melebihi stok tersedia (${selectedItemData.stock}).`, 
                    false);
                return;
            }
            
            const payload = {
                type: 'OUT',
                item_id: selectedItemData.id,
                quantity: quantity,
                recipient_name: recipientName,
                recipient_address: recipientAddress,
                note: note
            };
            
            // Disable submit button
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
                
                if (data.success) {
                    showMessageModal('✅ Sukses!', data.message, false);
                    form.reset();
                    
                    // Reload master data & history
                    loadMasterData().then(() => {
                        populateItemDropdown(supplierSelect.value);
                        updateStockInfo();
                        renderStaffHistory('OUT', 'riwayatKeluarPanel');
                    });
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

        // Load history
        renderStaffHistory('OUT', 'riwayatKeluarPanel');
    }
</script>