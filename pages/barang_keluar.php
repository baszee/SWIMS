<div class="card">
  <div style="display: flex; align-items: center; margin-bottom: 5px;">
    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📤</span> Barang Keluar
    </h2>
  </div>
  
  <!-- DEBUG INFO PANEL -->
  <div id="debugInfo" class="card" style="background:#fff3cd; border-color:#ffc107; margin-bottom:15px; display:none;">
    <h4 style="margin-top:0; color:#856404;">🔍 Debug Info</h4>
    <pre id="debugContent" style="background:#fff; padding:10px; border-radius:4px; font-size:0.85rem; overflow:auto; max-height:200px;"></pre>
    <button class="btn btn-sm" onclick="document.getElementById('debugInfo').style.display='none'">Tutup Debug</button>
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
    <div id="itemStockInfo" class="card" style="margin-top: 8px; padding: 10px; background: #f0f9ff; border-color: #3b82f6;">
        <p class="small" style="margin:0; color:#1e3a8a;" id="stockText">Pilih item untuk melihat stok</p>
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
    <button class="btn btn-sm" type="button" onclick="showDebugInfo()" style="margin-left:10px;">🔍 Show Debug Info</button>
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
    // DEBUG FUNCTION
    // ========================================
    function showDebugInfo() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            masterDataCache: {
                suppliers: masterDataCache.suppliers.length,
                items: masterDataCache.items.length,
                itemsSample: masterDataCache.items.slice(0, 3)
            },
            currentFilteredItems: currentFilteredItems.length,
            selectedItemData: selectedItemData
        };
        
        document.getElementById('debugContent').textContent = JSON.stringify(debugInfo, null, 2);
        document.getElementById('debugInfo').style.display = 'block';
        console.log('🔍 DEBUG INFO:', debugInfo);
    }
    
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
        infoDiv.style.display = 'block';
        document.getElementById('stockText').textContent = 'Pilih item untuk melihat stok';
        document.getElementById('qtyWarning').style.display = 'none';
        selectedItemData = null;
        
        // Filter items
        currentFilteredItems = masterDataCache.items.filter(item => {
            return !supplierId || item.supplier_id == supplierId;
        });

        console.log('📦 BARANG KELUAR - Populate Dropdown');
        console.log('   → Total items in cache:', masterDataCache.items.length);
        console.log('   → Filtered items count:', currentFilteredItems.length);
        console.log('   → Supplier filter:', supplierId || 'ALL');
        
        // Debug: Log all items
        console.log('   → Items detail:', masterDataCache.items.map(i => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            stock: i.current_stock,
            supplier_id: i.supplier_id
        })));

        if (currentFilteredItems.length === 0) {
            itemSelect.innerHTML = '<option value="">-- Tidak ada item tersedia --</option>';
            document.getElementById('stockText').innerHTML = '⚠️ Tidak ada item yang tersedia.<br>Kemungkinan: Belum ada item yang approved atau stok habis.';
            infoDiv.style.background = '#fee2e2';
            infoDiv.style.borderColor = '#ef4444';
            
            console.warn('⚠️ NO ITEMS AVAILABLE!');
            console.log('   → Check: Are there any approved items?');
            console.log('   → Check: Have transactions been approved by supervisor?');
            
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
        
        console.log('✅ Dropdown populated successfully');
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
            
            console.log('📦 Item selected:', selectedItemData);
            
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
            infoDiv.style.display = 'block';
            stockText.textContent = 'Pilih item untuk melihat stok';
            infoDiv.style.background = '#f0f9ff';
            infoDiv.style.borderColor = '#3b82f6';
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
    // INIT FUNCTION - ENHANCED DEBUG VERSION
    // ========================================
    window.init_barang_keluar = async function() {
        console.log('='.repeat(60));
        console.log('🚀 INIT BARANG KELUAR v7.0 - DEBUG MODE');
        console.log('='.repeat(60));
        
        // CRITICAL: Force reload master data
        console.log('🔄 Step 1: Force reloading master data...');
        showLoadingModal('Memuat data item terbaru...');
        
        try {
            await loadMasterData();
            
            console.log('✅ Step 2: Master data loaded');
            console.log('   → Total items in cache:', masterDataCache.items.length);
            console.log('   → Total suppliers:', masterDataCache.suppliers.length);
            
            // Debug: Log all items detail
            if (masterDataCache.items.length > 0) {
                console.log('📦 Items in cache:');
                masterDataCache.items.forEach((item, idx) => {
                    console.log(`   ${idx + 1}. ${item.name} (${item.sku})`);
                    console.log(`      → Stock: ${item.current_stock}`);
                    console.log(`      → Supplier ID: ${item.supplier_id}`);
                    console.log(`      → Created: ${item.created_at}`);
                });
            } else {
                console.error('❌ NO ITEMS IN CACHE!');
                console.log('   → Possible causes:');
                console.log('      1. No items have been approved by supervisor');
                console.log('      2. API endpoint returning empty data');
                console.log('      3. Database has no approved items');
            }
            
        } catch (error) {
            console.error('❌ Failed to load master data:', error);
            showMessageModal('Error', 'Gagal memuat data item: ' + error.message, false);
            hideLoadingModal();
            return;
        } finally {
            hideLoadingModal();
        }
        
        const form = document.getElementById('formBarangKeluar');
        const supplierSelect = document.getElementById('bk_supplier_id');
        const itemSelect = document.getElementById('bk_item_id');
        const qtyInput = document.getElementById('bk_qty');

        console.log('📍 Step 3: Setting up form...');
        
        // Populate Supplier Filter
        supplierSelect.innerHTML = '<option value="">-- Semua Klien --</option>';
        masterDataCache.suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        console.log('   ✅ Suppliers populated:', masterDataCache.suppliers.length);
        
        // Event: Supplier Filter Change
        supplierSelect.onchange = function() {
            console.log('🔍 Supplier filter changed to:', this.value);
            populateItemDropdown(this.value);
            updateStockInfo();
        };

        // Event: Item Selection Change
        itemSelect.onchange = updateStockInfo;
        
        // Event: Quantity Input
        qtyInput.oninput = validateQuantity;
        
        // Initial load (all items)
        console.log('📍 Step 4: Initial populate dropdown...');
        populateItemDropdown(''); 
        
        // ========================================
        // EVENT: Form Submit
        // ========================================
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            console.log('📤 Form submit triggered');
            
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
            
            console.log('📦 Sending payload:', payload);
            
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
                console.log('📦 Response:', data);
                
                if (data.success) {
                    showMessageModal('✅ Sukses!', data.message, false);
                    form.reset();
                    
                    // Reload master data & history
                    await loadMasterData();
                    populateItemDropdown(supplierSelect.value);
                    updateStockInfo();
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

        // Load history
        renderStaffHistory('OUT', 'riwayatKeluarPanel');
        
        console.log('✅ Barang Keluar initialized successfully');
        console.log('='.repeat(60));
    }
    
    // Expose showDebugInfo to global
    window.showDebugInfo = showDebugInfo;
</script>   