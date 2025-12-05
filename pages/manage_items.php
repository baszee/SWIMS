<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📦 Manajemen Item (Stok Gudang)</h2>
        <button class="btn primary" onclick="showItemForm()">+ Tambah Item Baru</button>
    </div>
    <p class="small">Administrator mengelola data master Item, SKU, Unit, dan Stok awal. Pastikan Supplier sudah terdaftar.</p>
</div>

<div id="itemListPanel">
    <!-- Konten tabel item akan di-load di sini oleh init_manage_items() -->
    <div class="card">
        <p>Memuat daftar item...</p>
    </div>
</div>

<script>
    // ----------- Logika CRUD Item di Sisi Frontend (JS) -----------

    // Fungsi untuk menampilkan form Tambah/Edit Item
    function showItemForm(item = null) {
        const isEdit = item !== null;
        let title = isEdit ? 'Edit Item' : 'Tambah Item Baru';
        
        // Data Supplier dari cache di js/app.js
        const suppliers = masterDataCache.suppliers;
        let supplierOptions = suppliers.map(s => 
            `<option value="${s.id}" ${isEdit && item.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`
        ).join('');
        
        let unitOptions = ['Pcs', 'Unit', 'Box'].map(u => 
            `<option value="${u}" ${isEdit && item.unit === u ? 'selected' : ''}>${u}</option>`
        ).join('');

        let formHtml = `
            <div class="card">
                <h3>${title}</h3>
                <form id="formItemManagement">
                    ${isEdit ? `<input type="hidden" id="itemId" value="${item.id}">` : ''}
                    
                    <label>Supplier (Klien Pemilik Barang)</label>
                    <select id="itemSupplierId" required ${isEdit ? 'disabled' : ''}>
                        <option value="">-- Pilih Supplier --</option>
                        ${supplierOptions}
                    </select>
                    ${isEdit ? `<p class="small" style="margin:5px 0;">Supplier tidak bisa diubah setelah dibuat.</p>` : ''}

                    <label>SKU (Stock Keeping Unit)</label>
                    <input type="text" id="itemSku" value="${isEdit ? item.sku : ''}" required ${isEdit ? 'disabled' : ''}>
                    
                    <label>Nama Item</label>
                    <input type="text" id="itemName" value="${isEdit ? item.name : ''}" required>
                    
                    <label>Unit Satuan</label>
                    <select id="itemUnit" required ${isEdit ? 'disabled' : ''}>
                        ${unitOptions}
                    </select>

                    <label>Stok Awal</label>
                    <input type="number" id="itemCurrentStock" value="${isEdit ? item.current_stock : 0}" min="0" required ${isEdit ? 'disabled' : ''}>
                    
                    <label>Stok Minimum (Peringatan)</label>
                    <input type="number" id="itemMinStock" value="${isEdit ? item.min_stock : 10}" min="0" required>
                    
                    ${isEdit ? `
                        <label>Status Item</label>
                        <select id="itemApproved">
                            <option value="true" ${item.is_approved == 1 ? 'selected' : ''}>APPROVED (Aktif Transaksi)</option>
                            <option value="false" ${item.is_approved == 0 ? 'selected' : ''}>PENDING (Non-aktif Transaksi)</option>
                        </select>
                    ` : ''}

                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                        <button type="button" class="btn" onclick="loadPage('manage_items')">Batal</button>
                        <button type="submit" class="btn primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Item'}</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('itemListPanel').innerHTML = formHtml;
        
        // Setup Submit Handler
        document.getElementById('formItemManagement').onsubmit = function(e) {
            e.preventDefault();
            submitItemForm(isEdit);
        };
    }
    
    // Fungsi submit form Item ke API
    async function submitItemForm(isEdit) {
        showLoadingModal('Memproses data item...');
        
        const id = document.getElementById('itemId')?.value;
        const supplier_id = document.getElementById('itemSupplierId').value;
        const sku = document.getElementById('itemSku').value;
        const name = document.getElementById('itemName').value;
        const unit = document.getElementById('itemUnit').value;
        const min_stock = parseInt(document.getElementById('itemMinStock').value);
        const is_approved = document.getElementById('itemApproved')?.value === 'true';

        let payload = {
            name: name,
            min_stock: min_stock,
        };
        
        if (isEdit) {
            payload.id = id;
            payload.is_approved = is_approved;
            // SKU, Supplier, Unit TIDAK bisa diubah (disabled)
        } else {
            payload.supplier_id = supplier_id;
            payload.sku = sku;
            payload.unit = unit;
            payload.current_stock = parseInt(document.getElementById('itemCurrentStock').value);
        }

        try {
            const response = await fetch('api/items.php', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses', data.message, false);
                loadPage('manage_items'); // Muat ulang halaman
            } else {
                showMessageModal('❌ Gagal', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Item Management.', false);
            console.error('Item form submit error:', error);
        } finally {
            hideLoadingModal();
        }
    }
    
    // Fungsi utama init_manage_items (Memuat Tabel)
    window.init_manage_items = async function() {
        // Wajib: Muat Master Data (Supplier) sebelum merender form
        await loadMasterData();
        
        const listDiv = document.getElementById('itemListPanel');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div class="card"><p>Memuat daftar item...</p></div>';
        showLoadingModal('Mengambil daftar item...');
        
        try {
            const response = await fetch('api/items.php');
            const data = await response.json();
            
            if (!data.success) {
                listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
                return;
            }

            let tableHtml = '<div class="card"><h3>Daftar Master Item Gudang</h3><table class="table"><thead><tr>';
            tableHtml += '<th>ID</th><th>SKU</th><th>Nama Item</th><th>Unit</th><th>Stok Saat Ini</th><th>Klien Pemilik</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
            
            data.data.forEach(item => {
                const statusBadge = item.is_approved == 1 ? '<span class="badge badge-success">APPROVED</span>' : '<span class="badge badge-warning">PENDING</span>';
                
                tableHtml += `
                    <tr>
                        <td>${item.id}</td>
                        <td>${item.sku}</td>
                        <td>${item.name}</td>
                        <td>${item.unit}</td>
                        <td>${item.current_stock}</td>
                        <td>${item.supplier_name}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn primary btn-sm" onclick='showItemForm(${JSON.stringify(item)})'>Edit</button>
                        </td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table></div>';
            listDiv.innerHTML = tableHtml;

        } catch (error) {
            listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p></div>`;
            console.error('Item list load error:', error);
        } finally {
            hideLoadingModal();
        }
    }
</script>