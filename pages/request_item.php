<div class="card">
    <h2>➕ Request Item Baru & Klien/Supplier Baru</h2>
    <p class="small">Staff dapat mengajukan Item atau Klien/Supplier baru. Semua pengajuan akan masuk status **PENDING** dan membutuhkan persetujuan Supervisor.</p>
</div>

<div class="menu" id="requestTabs">
    <button class="btn primary" onclick="showRequestForm('item', this)">Ajukan Item Baru</button>
    <button class="btn" onclick="showRequestForm('supplier', this)">Ajukan Klien/Supplier Baru</button>
</div>

<div id="requestFormContent">
    <!-- Konten form akan dimuat di sini oleh JavaScript -->
</div>

<script>
    // Pastikan fungsi showLoadingModal, hideLoadingModal, showMessageModal, dan loadMasterData ada di js/app.js
    
    // Global function untuk merender form
    function showRequestForm(type, element) {
        const contentDiv = document.getElementById('requestFormContent');
        const tabs = document.getElementById('requestTabs').querySelectorAll('button');

        // Reset tab styling
        tabs.forEach(btn => btn.className = 'btn');
        element.className = 'btn primary'; 

        if (type === 'item') {
            // Ambil data Supplier dari cache yang sudah dimuat di init_staff()
            const suppliers = masterDataCache.suppliers; 
            let supplierOptions = suppliers.map(s => 
                `<option value="${s.id}">${s.name}</option>`
            ).join('');
            
            contentDiv.innerHTML = `
                <div class="card">
                    <h3>Form Pengajuan Item Baru</h3>
                    <form id="formRequestItem">
                        <label>Pilih Supplier (Klien Pemilik)</label>
                        <select id="reqItemSupplierId" required>
                            <option value="" disabled selected>-- Pilih Klien Pemilik --</option>
                            ${supplierOptions}
                        </select>
                        <p class="small">Jika Klien belum ada, ajukan Klien Baru di tab sebelah.</p>

                        <label>SKU (Stock Keeping Unit)</label>
                        <input type="text" id="reqItemSku" required placeholder="Contoh: LAPTOP-ASUS-X540">
                        
                        <label>Nama Item</label>
                        <input type="text" id="reqItemName" required placeholder="Contoh: Laptop Asus X540">
                        
                        <label>Unit Satuan</label>
                        <select id="reqItemUnit" required>
                            <option value="Pcs" selected>Pcs</option>
                            <option value="Unit">Unit</option>
                            <option value="Box">Box</option>
                        </select>

                        <label>Stok Minimum yang Disarankan</label>
                        <input type="number" id="reqItemMinStock" value="10" min="0" required>
                        
                        <button type="submit" class="btn success" style="margin-top:20px;">Ajukan Item ke Supervisor</button>
                    </form>
                </div>
            `;
            
            document.getElementById('formRequestItem').onsubmit = handleItemRequest;

        } else if (type === 'supplier') {
            contentDiv.innerHTML = `
                <div class="card">
                    <h3>Form Pengajuan Klien/Supplier Baru</h3>
                    <form id="formRequestSupplier">
                        <label>Nama Klien/PT</label>
                        <input type="text" id="reqSupplierName" required placeholder="Contoh: PT Samsung Indonesia">
                        
                        <label>Nama Kontak Person</label>
                        <input type="text" id="reqSupplierContact" placeholder="Contoh: Budi Santoso">
                        
                        <label>Nomor Telepon</label>
                        <input type="text" id="reqSupplierPhone" placeholder="Contoh: 0812xxxxxx">

                        <label>Alamat Lengkap</label>
                        <textarea id="reqSupplierAddress" rows="3" placeholder="Alamat Gudang / Kantor Klien"></textarea>
                        
                        <button type="submit" class="btn success" style="margin-top:20px;">Ajukan Klien ke Supervisor</button>
                    </form>
                </div>
            `;
            
            document.getElementById('formRequestSupplier').onsubmit = handleSupplierRequest;
        }
    }

    // Handler Submit Permintaan Item Baru
    async function handleItemRequest(e) {
        e.preventDefault();
        
        const payload = {
            supplier_id: document.getElementById('reqItemSupplierId').value,
            sku: document.getElementById('reqItemSku').value,
            name: document.getElementById('reqItemName').value,
            unit: document.getElementById('reqItemUnit').value,
            min_stock: parseInt(document.getElementById('reqItemMinStock').value),
            // Catatan: is_approved = FALSE, current_stock = 0 (didefinisikan di API POST items)
        };
        
        showLoadingModal('Mengajukan item baru...');
        
        try {
            const response = await fetch('api/items.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message + '<br>Permintaan item Anda telah diajukan ke Supervisor.', false);
                document.getElementById('formRequestItem').reset();
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Item.', false);
            console.error('Request Item error:', error);
        } finally {
            hideLoadingModal();
        }
    }

    // Handler Submit Permintaan Supplier Baru
    async function handleSupplierRequest(e) {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('reqSupplierName').value,
            contact_person: document.getElementById('reqSupplierContact').value,
            phone: document.getElementById('reqSupplierPhone').value,
            address: document.getElementById('reqSupplierAddress').value,
            // Catatan: is_active = FALSE (didefinisikan di API POST suppliers)
        };
        
        showLoadingModal('Mengajukan Klien/Supplier baru...');
        
        try {
            const response = await fetch('api/suppliers.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message + '<br>Permintaan Klien/Supplier baru telah diajukan ke Supervisor.', false);
                document.getElementById('formRequestSupplier').reset();
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Supplier.', false);
            console.error('Request Supplier error:', error);
        } finally {
            hideLoadingModal();
        }
    }

    // Fungsi init_request_item: Dipanggil saat halaman dimuat
    window.init_request_item = function() {
        // Muat data master (untuk dropdown Supplier)
        loadMasterData().then(() => {
            // Tampilkan form Item Baru secara default
            showRequestForm('item', document.querySelector('#requestTabs button:first-child'));
        });
    }

    // Expose fungsi ke global scope
    window.showRequestForm = showRequestForm;
</script>