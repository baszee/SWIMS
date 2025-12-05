<div class="card">
  <div style="display: flex; align-items: center; margin-bottom: 5px;">
    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📤</span> Barang Keluar
    </h2>
  </div>
  
  <form id="formBarangKeluar">
    <!-- Dropdown Supplier (Digunakan untuk Filtering Item) -->
    <label>Filter Item Berdasarkan Klien/Supplier (Opsional)</label>
    <select id="bk_supplier_id">
        <option value="">-- Tampilkan Semua Klien --</option>
        <!-- Options dimuat oleh JS dari masterDataCache.suppliers -->
    </select>
    
    <!-- Dropdown Item -->
    <label>Pilih Item (Wajib)</label>
    <select id="bk_item_id" required>
        <option value="">-- Pilih Item --</option>
        <!-- Options Item dimuat dan difilter oleh JS -->
    </select>
    <p class="small" id="itemStockInfo" style="margin-top: 5px; color: var(--muted);">Stok Saat Ini: -</p>
    
    <label>Jumlah (Pcs, Unit, atau Box)</label>
    <input id="bk_qty" type="number" min="1" required>
    
    <!-- Field Penerima (Sesuai Skema Baru) -->
    <label>Nama Penerima (Toko/Individu)</label>
    <input type="text" id="bk_recipient_name" required placeholder="Nama Toko atau Individu">

    <label>Alamat Penerima</label>
    <textarea id="bk_recipient_address" rows="3" required placeholder="Alamat pengiriman barang keluar..."></textarea>
    
    <label>Catatan</label>
    <textarea id="bk_note" rows="3" placeholder="Opsional: alasan pengambilan barang..."></textarea>
    
    <button class="btn primary" type="submit">Request Barang Keluar</button>
  </form>
  
  <div class="card" style="margin-top:16px;background:#dbeafe;border-color:#3b82f6;">
    <h4 style="margin-top:0;">📋 Catatan</h4>
    <p class="small" style="color:#1e3a8a;margin:0;">Transaksi keluar disimpan sebagai <b>PENDING</b> sampai Supervisor approve. Stok akan dikurangi saat approved. Pastikan jumlah yang diminta tidak melebihi stok yang tersedia.</p>
  </div>
</div>

<!-- Riwayat Transaksi Saya -->
<div class="card">
    <h3>Riwayat Transaksi Keluar Saya</h3>
    <div id="riwayatKeluarPanel">
        <!-- Tabel riwayat dimuat oleh JS -->
        <p>Memuat riwayat transaksi...</p>
    </div>
</div>

<script>
    // ----------- Logika Barang Keluar (JS) -----------
    
    let currentFilteredItems = [];
    
    // Fungsi untuk mengisi dropdown Item berdasarkan filter Supplier
    function populateItemDropdown(supplierId = '') {
        const itemSelect = document.getElementById('bk_item_id');
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        document.getElementById('itemStockInfo').textContent = 'Stok Saat Ini: -';
        
        currentFilteredItems = masterDataCache.items.filter(item => {
            return !supplierId || item.supplier_id == supplierId;
        });

        currentFilteredItems.forEach(item => {
            itemSelect.innerHTML += `<option value="${item.id}" data-stock="${item.current_stock}">${item.sku} - ${item.name} (Stok: ${item.current_stock})</option>`;
        });
    }

    // Fungsi untuk menampilkan info stok saat item dipilih
    function updateStockInfo() {
        const itemSelect = document.getElementById('bk_item_id');
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const infoDiv = document.getElementById('itemStockInfo');
        
        if (selectedOption && selectedOption.value) {
            const stock = selectedOption.getAttribute('data-stock');
            const item = currentFilteredItems.find(i => i.id == selectedOption.value);

            infoDiv.textContent = `Stok Tersedia: ${stock} ${item.unit}`;
            
            // Set max value untuk input qty
            document.getElementById('bk_qty').max = stock;
        } else {
            infoDiv.textContent = 'Stok Saat Ini: -';
        }
    }
    
    // Fungsi init_barang_keluar
    window.init_barang_keluar = function() {
        const form = document.getElementById('formBarangKeluar');
        const supplierSelect = document.getElementById('bk_supplier_id');
        const itemSelect = document.getElementById('bk_item_id');

        // Populate Dropdown Supplier Filter (termasuk opsi 'Semua')
        masterDataCache.suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        
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
            const availableStock = parseInt(selectedItemOption.getAttribute('data-stock'));

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
                recipient_name: recipientName, // Dikirim ke API
                recipient_address: recipientAddress, // Dikirim ke API
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
                        populateItemDropdown(supplierSelect.value); // Muat ulang dropdown dengan stok terbaru
                        updateStockInfo();
                        renderStaffHistory('OUT', 'riwayatKeluarPanel');
                    });
                } else {
                    showMessageModal('❌ Gagal!', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi.', false);
                console.error('Transaction submit error:', error);
            } finally {
                hideLoadingModal();
            }
        };

        // Muat Riwayat Transaksi Keluar
        renderStaffHistory('OUT', 'riwayatKeluarPanel');
    }
</script>