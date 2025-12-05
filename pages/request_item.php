<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🔗</span> Request Klien/Supplier Baru
        </h2>
    </div>
    <p class="small">Jika Klien/PT pemilik barang belum terdaftar di sistem, ajukan pendaftarannya di sini. Klien baru akan masuk status **PENDING** sampai disetujui Supervisor.</p>
</div>

<!-- Form Pengajuan Klien/Supplier Baru (Satu Form Saja) -->
<div class="card">
    <h3>Form Pengajuan Klien/Supplier</h3>
    <form id="formRequestSupplier">
        <label>Nama Klien/PT</label>
        <input type="text" id="reqSupplierName" required placeholder="Contoh: PT Samsung Indonesia">
        
        <label>Nama Kontak Person</label>
        <input type="text" id="reqSupplierContact" placeholder="Opsional: Nama kontak">
        
        <label>Nomor Telepon</label>
        <input type="text" id="reqSupplierPhone" placeholder="Opsional: 0812xxxxxx">

        <label>Alamat Lengkap</label>
        <textarea id="reqSupplierAddress" rows="3" placeholder="Alamat Gudang / Kantor Klien"></textarea>
        
        <button type="submit" class="btn primary" style="width:100%; margin-top:20px;">Kirim Request Klien</button>
    </form>
</div>

<!-- Tabel Riwayat Request Saya -->
<div class="card">
    <h3>Riwayat Request Saya</h3>
    <p class="small">Status pengajuan Klien/Supplier yang pernah Anda buat. Gunakan fitur ini untuk memantau apakah klien sudah aktif.</p>
    <div id="requestHistoryPanel">
        <!-- Tabel riwayat dimuat oleh JS -->
        <p>Memuat riwayat...</p>
    </div>
</div>

<script>
    // Pastikan fungsi-fungsi umum (showMessageModal, loadMasterData, currentUser) tersedia di js/app.js
    
    // Handler Submit Permintaan Supplier Baru
    async function handleSupplierRequest(e) {
        e.preventDefault();
        
        const form = document.getElementById('formRequestSupplier');
        const payload = {
            name: document.getElementById('reqSupplierName').value,
            contact_person: document.getElementById('reqSupplierContact').value,
            phone: document.getElementById('reqSupplierPhone').value,
            address: document.getElementById('reqSupplierAddress').value,
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
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                loadRequestHistory(); // Muat ulang riwayat
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

    // Fungsi untuk memuat riwayat request Supplier yang diajukan oleh user saat ini
    async function loadRequestHistory() {
        const historyDiv = document.getElementById('requestHistoryPanel');
        const user = currentUser();
        if (!user) return;
        
        historyDiv.innerHTML = '<p>Memuat riwayat...</p>';
        
        try {
            // Memanggil endpoint baru di api/suppliers.php
            const response = await fetch(`api/suppliers.php?action=my_requests`);
            const data = await response.json();

            if (!data.success) {
                 historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Gagal memuat riwayat: ${data.message}</p>`;
                 return;
            }

            if (data.data.length === 0) {
                 historyDiv.innerHTML = `<p>Anda belum pernah mengajukan Klien/Supplier baru.</p>`;
                 return;
            }

            let tableHtml = '<table class="table"><thead><tr>';
            tableHtml += '<th>ID</th><th>Nama Klien/PT</th><th>Status</th><th>Diajukan</th></tr></thead><tbody>';
            
            data.data.forEach(req => {
                let statusBadge;
                if (req.is_active == 1) {
                    statusBadge = '<span class="badge badge-success">APPROVED</span>';
                } else if (req.is_active == 0) {
                    // Jika is_active = 0, berarti PENDING (setelah diajukan Staff)
                    statusBadge = '<span class="badge badge-warning">PENDING</span>';
                } else {
                    // Jika ada status lain/null, kita anggap Rejected
                    statusBadge = '<span class="badge badge-danger">REJECTED</span>';
                }
                
                tableHtml += `
                    <tr>
                        <td>${req.id}</td>
                        <td>${req.name}</td>
                        <td>${statusBadge}</td>
                        <td>${req.created_at.substring(0, 10)}</td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table>';
            historyDiv.innerHTML = tableHtml;

        } catch (error) {
            historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Error saat memuat riwayat: ${error.message}</p>`;
            console.error('Request history load error:', error);
        }
    }

    // Fungsi init_request_item: Dipanggil saat halaman dimuat
    window.init_request_item = function() {
        // Setup Submit Handler pada form yang sudah ada di HTML
        const form = document.getElementById('formRequestSupplier');
        if (form) {
            form.onsubmit = handleSupplierRequest;
        }
        
        // Muat riwayat
        loadRequestHistory();
    }
    
    // Expose fungsi ke global scope
    window.loadRequestHistory = loadRequestHistory;
</script>