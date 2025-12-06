<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🔗</span> Request Klien/Supplier Baru
        </h2>
    </div>
    <p class="small">Jika Klien/PT pemilik barang belum terdaftar di sistem, ajukan pendaftarannya di sini. Klien baru akan masuk status **PENDING** sampai disetujui Supervisor.</p>
</div>

<!-- Form Pengajuan Klien/Supplier Baru -->
<div class="card">
    <h3>Form Pengajuan Klien/Supplier</h3>
    <form id="formRequestSupplier">
        <label>Nama Klien/PT <span style="color:red;">*</span></label>
        <input type="text" id="reqSupplierName" required placeholder="Contoh: PT Samsung Indonesia">
        
        <label>Nama Kontak Person</label>
        <input type="text" id="reqSupplierContact" placeholder="Opsional: Nama kontak">
        
        <label>Nomor Telepon</label>
        <input type="text" id="reqSupplierPhone" placeholder="Opsional: 0812xxxxxx">

        <label>Alamat Lengkap</label>
        <textarea id="reqSupplierAddress" rows="3" placeholder="Alamat Gudang / Kantor Klien"></textarea>
        
        <button type="submit" class="btn primary" style="width:100%; margin-top:20px;">
            <span id="btnText">Kirim Request Klien</span>
        </button>
    </form>
    
    <div class="card" style="margin-top:16px;background:#dbeafe;border-color:#3b82f6;">
        <h4 style="margin-top:0;">ℹ️ Informasi</h4>
        <p class="small" style="color:#1e3a8a;margin:0;">
            Setelah mengirim request, Supervisor akan mereview dan menyetujui. Anda dapat memantau status di tabel Riwayat Request di bawah.
        </p>
    </div>
</div>

<!-- Tabel Riwayat Request Saya -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>Riwayat Request Saya</h3>
        <button class="btn btn-sm" onclick="loadRequestHistory()">🔄 Refresh</button>
    </div>
    <p class="small">Status pengajuan Klien/Supplier yang pernah Anda buat.</p>
    <div id="requestHistoryPanel">
        <p>Memuat riwayat...</p>
    </div>
</div>

<script>
    // ========================================
    // HANDLER: Submit Request Supplier
    // ========================================
    async function handleSupplierRequest(e) {
        e.preventDefault();
        
        const form = document.getElementById('formRequestSupplier');
        const btnText = document.getElementById('btnText');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Ambil data form
        const name = document.getElementById('reqSupplierName').value.trim();
        const contact = document.getElementById('reqSupplierContact').value.trim();
        const phone = document.getElementById('reqSupplierPhone').value.trim();
        const address = document.getElementById('reqSupplierAddress').value.trim();
        
        // Validasi minimal
        if (!name) {
            showMessageModal('Validasi', 'Nama Klien/Supplier wajib diisi!', false);
            return;
        }
        
        // Disable button
        submitBtn.disabled = true;
        btnText.textContent = 'Mengirim...';
        
        const payload = {
            name: name,
            contact_person: contact,
            phone: phone,
            address: address
        };
        
        console.log('Sending payload:', payload); // Debug
        
        try {
            const response = await fetch('api/suppliers.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status); // Debug
            
            const data = await response.json();
            console.log('Response data:', data); // Debug
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                
                // Reload history setelah 1 detik
                setTimeout(() => {
                    loadRequestHistory();
                }, 1000);
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            console.error('Request error:', error);
            showMessageModal('Error Jaringan', 'Gagal terhubung ke server: ' + error.message, false);
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            btnText.textContent = 'Kirim Request Klien';
        }
    }

    // ========================================
    // FUNCTION: Load Request History
    // ========================================
    async function loadRequestHistory() {
        const historyDiv = document.getElementById('requestHistoryPanel');
        const user = currentUser();
        
        if (!user) {
            historyDiv.innerHTML = '<p class="small" style="color:var(--danger);">User tidak terdeteksi. Silakan login ulang.</p>';
            return;
        }
        
        historyDiv.innerHTML = '<p style="text-align:center;"><em>Memuat riwayat...</em></p>';
        
        try {
            console.log('Fetching history from: api/suppliers.php?action=my_requests'); // Debug
            
            const response = await fetch('api/suppliers.php?action=my_requests');
            
            console.log('History response status:', response.status); // Debug
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('History data:', data); // Debug

            if (!data.success) {
                historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Gagal memuat riwayat: ${data.message}</p>`;
                return;
            }

            if (data.data.length === 0) {
                historyDiv.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <p style="font-size:3rem; margin:0;">📦</p>
                        <p style="color:var(--muted);">Anda belum pernah mengajukan Klien/Supplier baru.</p>
                    </div>
                `;
                return;
            }

            let tableHtml = '<table class="table"><thead><tr>';
            tableHtml += '<th>ID</th><th>Nama Klien/PT</th><th>Kontak</th><th>Status</th><th>Diajukan</th></tr></thead><tbody>';
            
            data.data.forEach(req => {
                let statusBadge;
                if (req.is_active == 1) {
                    statusBadge = '<span class="badge badge-success">✅ APPROVED</span>';
                } else {
                    statusBadge = '<span class="badge badge-warning">⏳ PENDING</span>';
                }
                
                tableHtml += `
                    <tr>
                        <td>${req.id}</td>
                        <td><strong>${req.name}</strong></td>
                        <td class="small">${req.contact_person || '-'}<br>${req.phone || '-'}</td>
                        <td>${statusBadge}</td>
                        <td>${req.created_at ? req.created_at.substring(0, 16) : '-'}</td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table>';
            historyDiv.innerHTML = tableHtml;

        } catch (error) {
            console.error('History load error:', error);
            historyDiv.innerHTML = `
                <div class="card" style="background:#fee2e2; border-color:#ef4444;">
                    <h4 style="color:#991b1b; margin-top:0;">❌ Error Memuat History</h4>
                    <p class="small" style="color:#7f1d1d; margin:0;">
                        ${error.message}<br><br>
                        <strong>Kemungkinan penyebab:</strong><br>
                        • Endpoint API tidak ditemukan<br>
                        • Server tidak merespons<br>
                        • Session expired
                    </p>
                </div>
            `;
        }
    }

    // ========================================
    // INIT FUNCTION
    // ========================================
    window.init_request_item = function() {
        console.log('Init request_item page'); // Debug
        
        // Setup Submit Handler
        const form = document.getElementById('formRequestSupplier');
        if (form) {
            form.onsubmit = handleSupplierRequest;
            console.log('Form submit handler attached'); // Debug
        } else {
            console.error('Form not found!'); // Debug
        }
        
        // Load history
        loadRequestHistory();
    }
    
    // Expose to global
    window.loadRequestHistory = loadRequestHistory;
</script>