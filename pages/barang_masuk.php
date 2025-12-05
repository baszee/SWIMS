<div class="card">
  <div style="display: flex; align-items: center; margin-bottom: 5px;">
    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📦</span> Barang Masuk
    </h2>
  </div>
  
  <form id="formBarangMasuk">
    <!-- Dropdown Supplier -->
    <label>Pilih Klien/Supplier (Wajib)</label>
    <select id="bm_supplier_id" required>
        <option value="">-- Pilih Klien Pemilik Barang --</option>
        <!-- Options dimuat oleh JS dari masterDataCache.suppliers -->
    </select>
    
    <!-- Input SKU Item (Autocomplete) -->
    <label>SKU Barang (Cari atau Input Baru)</label>
    <div style="position: relative;">
        <input type="text" id="bm_sku_input" required placeholder="Ketik SKU atau Nama Item...">
        <!-- Hidden input untuk menyimpan ID Item yang dipilih -->
        <input type="hidden" id="bm_item_id" required> 
        <div id="autocompleteResults" class="autocomplete-dropdown" style="display:none;">
            <!-- Hasil autocomplete dimuat di sini -->
        </div>
    </div>
    <p class="small" id="itemInfo" style="margin-top: 5px; color: var(--muted);">Status Item: -</p>
    
    <label>Jumlah (Pcs, Unit, atau Box)</label>
    <input id="bm_qty" type="number" min="1" required>
    
    <label>Catatan</label>
    <textarea id="bm_note" rows="3" placeholder="Opsional: tambahkan catatan..."></textarea>
    
    <button class="btn success" type="submit">Request Barang Masuk</button>
  </form>
  
  <div class="card" style="margin-top:16px;background:#fef3c7;border-color:#fbbf24;">
    <h4 style="margin-top:0;">⚠️ Perhatian</h4>
    <p class="small" style="color:#78350f;margin:0;">Transaksi barang masuk akan disimpan sebagai <b>PENDING</b>. Stok <b>belum akan bertambah</b> sampai Supervisor melakukan approval. Ini memastikan setiap penambahan stok terverifikasi dengan baik.</p>
  </div>
</div>

<!-- Riwayat Transaksi Saya -->
<div class="card">
    <h3>Riwayat Transaksi Masuk Saya</h3>
    <div id="riwayatMasukPanel">
        <!-- Tabel riwayat dimuat oleh JS -->
        <p>Memuat riwayat transaksi...</p>
    </div>
</div>

<script>
    // ----------- Logika Barang Masuk (JS) -----------
    
    let selectedItemId = null;
    let selectedSupplierId = null;

    // Fungsi untuk memuat riwayat transaksi Staff (IN/OUT)
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
    
    // Fungsi untuk mencari item (Autocomplete)
    async function searchItem(query) {
        const supplierId = document.getElementById('bm_supplier_id').value;
        const resultsDiv = document.getElementById('autocompleteResults');
        resultsDiv.innerHTML = '';

        if (query.length < 2 || !supplierId) {
            resultsDiv.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`api/items.php?action=search&supplier_id=${supplierId}&q=${query}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                data.data.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'autocomplete-item';
                    el.innerHTML = `<strong>${item.sku}</strong> - ${item.name} (${item.unit})`;
                    el.onclick = () => selectItem(item);
                    resultsDiv.appendChild(el);
                });
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.innerHTML = '<div class="autocomplete-item disabled">Tidak ada item yang ditemukan.</div>';
                resultsDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Autocomplete failed:', error);
            resultsDiv.style.display = 'none';
        }
    }
    
    // Fungsi saat item dipilih dari autocomplete
    function selectItem(item) {
        document.getElementById('bm_sku_input').value = `${item.sku} - ${item.name}`;
        document.getElementById('bm_item_id').value = item.id;
        selectedItemId = item.id;
        document.getElementById('itemInfo').textContent = `Status Item: APPROVED | Unit: ${item.unit} | Stok Saat Ini: ${item.current_stock}`;
        document.getElementById('autocompleteResults').style.display = 'none';
    }
    
    // Fungsi reset item selection
    function resetItemSelection() {
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null;
        document.getElementById('itemInfo').textContent = `Status Item: -`;
    }

    // Fungsi init_barang_masuk
    window.init_barang_masuk = function() {
        const form = document.getElementById('formBarangMasuk');
        const supplierSelect = document.getElementById('bm_supplier_id');
        const skuInput = document.getElementById('bm_sku_input');

        // Populate Dropdown Supplier
        masterDataCache.suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        
        // 1. Event Listener untuk perubahan Supplier
        supplierSelect.onchange = function() {
            selectedSupplierId = this.value;
            resetItemSelection();
            skuInput.value = '';
        };

        // 2. Event Listener untuk Autocomplete SKU
        skuInput.oninput = (e) => {
            resetItemSelection();
            searchItem(e.target.value);
        };
        
        // 3. Event Listener untuk Form Submission
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            if (!selectedItemId || !selectedSupplierId) {
                 showMessageModal('Validasi', 'Mohon pilih Supplier dan Item yang valid.', false);
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
                showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi.', false);
                console.error('Transaction submit error:', error);
            } finally {
                hideLoadingModal();
            }
        };

        // Muat Riwayat Transaksi Masuk
        renderStaffHistory('IN', 'riwayatMasukPanel');
    }
</script>

<style>
/* Styling tambahan untuk Autocomplete Dropdown */
.autocomplete-dropdown {
    position: absolute;
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ddd;
    background: var(--card);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    margin-top: 2px;
    border-radius: 6px;
}

.autocomplete-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    font-size: 0.9rem;
}

.autocomplete-item:hover {
    background: #f1f5f9;
}

.autocomplete-item:last-child {
    border-bottom: none;
}
</style>