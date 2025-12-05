<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📝 Daftar Catatan Internal</h2>
        <button class="btn success" onclick="showNoteForm()">+ Buat Catatan</button>
    </div>
    <p class="small">Digunakan untuk komunikasi penting antar Supervisor dan Owner.</p>
</div>

<div id="notesList">
    <!-- Daftar Notes akan dimuat di sini -->
</div>

<div class="card" style="border-left: 4px solid var(--primary);">
    <h3>Audit Verifikasi Transaksi (Simulasi QR Code)</h3>
    <p class="small">Supervisor dapat mengeluarkan Nota Transaksi. Owner/Supervisor dapat memverifikasi QR Code Nota di sini.</p>
    <label>ID Transaksi yang diverifikasi</label>
    <input type="text" id="verifyTxnCode" placeholder="Contoh: BM-20251205-001">
    <button class="btn primary" onclick="verifyTransactionQr()">Verifikasi Nota</button>
    <div id="verificationResult" style="margin-top: 15px; font-weight: 600;"></div>
</div>


<script>
    // ----------- Logika Notes & QR Verification (JS) -----------
    
    // Global variable untuk menyimpan data transaksi (simulasi Nota)
    let transactionNotesCache = [];

    // Fungsi untuk menampilkan form Tambah Catatan
    function showNoteForm(note = null) {
        const isEdit = note !== null;
        let title = isEdit ? 'Edit Catatan' : 'Buat Catatan Baru';
        
        const targetRoleOptions = `
            <option value="all">Semua (Supervisor & Owner)</option>
            <option value="supervisor">Hanya Supervisor</option>
            <option value="owner">Hanya Owner</option>
        `;

        let formHtml = `
            <div class="card">
                <h3>${title}</h3>
                <form id="formNoteManagement">
                    <label>Judul Catatan</label>
                    <input type="text" id="noteTitle" value="${isEdit ? note.title : ''}" required>
                    
                    <label>Isi Catatan</label>
                    <textarea id="noteContent" rows="5" required>${isEdit ? note.content : ''}</textarea>
                    
                    <label>Target Role</label>
                    <select id="noteTargetRole" required>
                        ${targetRoleOptions}
                    </select>

                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                        <button type="button" class="btn" onclick="loadPage('notes')">Batal</button>
                        <button type="submit" class="btn primary">${isEdit ? 'Simpan Perubahan' : 'Buat Catatan'}</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('notesList').innerHTML = formHtml;
        
        // Atur nilai dropdown jika edit
        if (isEdit) {
            document.getElementById('noteTargetRole').value = note.created_for_role;
        }

        // Setup Submit Handler
        document.getElementById('formNoteManagement').onsubmit = function(e) {
            e.preventDefault();
            submitNoteForm();
        };
    }

    // Fungsi submit form Note ke API
    async function submitNoteForm() {
        showLoadingModal('Memposting catatan...');
        
        const payload = {
            title: document.getElementById('noteTitle').value,
            content: document.getElementById('noteContent').value,
            target_role: document.getElementById('noteTargetRole').value,
        };
        
        try {
            const response = await fetch('api/notes.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses', data.message, false);
                loadPage('notes'); // Muat ulang halaman
            } else {
                showMessageModal('❌ Gagal', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Notes.', false);
            console.error('Note form submit error:', error);
        } finally {
            hideLoadingModal();
        }
    }
    
    // Fungsi utama untuk memuat Daftar Notes
    async function loadNotesList() {
        const listDiv = document.getElementById('notesList');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div class="card"><p>Memuat catatan...</p></div>';
        showLoadingModal('Mengambil daftar catatan...');
        
        try {
            const response = await fetch('api/notes.php');
            const data = await response.json();
            
            if (!data.success) {
                listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
                return;
            }

            if (data.data.length === 0) {
                listDiv.innerHTML = '<div class="card"><p>Tidak ada catatan internal saat ini.</p></div>';
                return;
            }
            
            let html = '<div class="card"><h3>Daftar Catatan Terkini</h3>';
            
            // Render Notes
            data.data.forEach(note => {
                // Tampilkan tombol Hapus hanya jika user adalah pembuat atau Owner
                const isDeletable = note.created_by === currentUser().username || currentUser().role === 'owner';
                
                html += `
                    <div class="card" style="margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin:0; color:var(--primary);">${note.title}</h4>
                            ${isDeletable ? `<button class="btn danger btn-sm" onclick="deleteNote(${note.id})">Hapus</button>` : ''}
                        </div>
                        <p class="small" style="margin:5px 0 10px 0;">Oleh: <b>${note.created_by}</b> (${note.created_for_role.toUpperCase()}) | Tanggal: ${note.created_at.substring(0, 16)}</p>
                        <p>${note.content}</p>
                    </div>
                `;
            });

            listDiv.innerHTML = html + '</div>';

        } catch (error) {
            listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p></div>`;
            console.error('Notes list load error:', error);
        } finally {
            hideLoadingModal();
        }
    }
    
    // Fungsi Hapus Note
    function deleteNote(id) {
         showMessageModal(
            'Konfirmasi Hapus',
            'Apakah Anda yakin ingin menghapus catatan ini?',
            true,
            async () => {
                showLoadingModal('Menghapus catatan...');
                try {
                    const response = await fetch(`api/notes.php?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessageModal('✅ Sukses', data.message, false);
                        loadNotesList(); // Muat ulang daftar
                    } else {
                        showMessageModal('❌ Gagal', data.message, false);
                    }
                } catch (error) {
                    showMessageModal('Error Jaringan', 'Gagal menghapus catatan.', false);
                } finally {
                    hideLoadingModal();
                }
            }
        );
    }
    
    
    // ----------- Logika QR Code Verifikasi -----------

    // Fungsi untuk memverifikasi Kode Transaksi (Simulasi)
    async function verifyTransactionQr() {
        const txnCode = document.getElementById('verifyTxnCode').value.trim();
        const resultDiv = document.getElementById('verificationResult');
        resultDiv.textContent = '';
        
        if (!txnCode) {
            resultDiv.textContent = 'Masukkan Kode Transaksi (contoh: BM-20251205-001).';
            resultDiv.style.color = 'var(--warning)';
            return;
        }

        showLoadingModal('Memverifikasi Kode Transaksi...');
        
        try {
            // Panggil API report.php (action=history) untuk mencari detail transaksi
            const response = await fetch(`api/report.php?action=history`);
            const data = await response.json();

            if (!data.success) {
                resultDiv.textContent = 'Gagal mengambil data dari server.';
                resultDiv.style.color = 'var(--danger)';
                return;
            }
            
            // Cari transaksi yang cocok dengan kode
            const transaction = data.data.find(t => t.transaction_code === txnCode);
            
            if (transaction) {
                if (transaction.status === 'APPROVED') {
                    // Berhasil dan APPROVED
                    resultDiv.innerHTML = `✅ **VERIFIKASI BERHASIL!**<br>
                                            <span class="small">Kode: ${transaction.transaction_code} (${transaction.type}) | Item: ${transaction.item_name}<br>
                                            Status: ${transaction.status} | Disetujui Oleh: ${transaction.approver}</span>`;
                    resultDiv.style.color = 'var(--success)';
                } else {
                    // Ditemukan tapi statusnya PENDING/REJECTED
                    resultDiv.innerHTML = `⚠️ **CATATAN DITEMUKAN, TAPI STATUS BUKAN APPROVED.**<br>
                                            <span class="small">Kode: ${transaction.transaction_code} | Status Database: ${transaction.status}</span>`;
                    resultDiv.style.color = 'var(--warning)';
                }
            } else {
                // Tidak ditemukan
                resultDiv.textContent = '❌ Kode Transaksi tidak ditemukan di database. Nota mungkin palsu atau belum disetujui.';
                resultDiv.style.color = 'var(--danger)';
            }
            
        } catch (error) {
            resultDiv.textContent = '❌ Error saat menghubungi server.';
            resultDiv.style.color = 'var(--danger)';
            console.error('QR Verification error:', error);
        } finally {
            hideLoadingModal();
        }
    }


    // Fungsi init_notes: Dipanggil saat halaman dimuat
    window.init_notes = function() {
        loadNotesList();
    }
    
    // Expose fungsi ke global scope
    window.showNoteForm = showNoteForm;
    window.deleteNote = deleteNote;
    window.verifyTransactionQr = verifyTransactionQr;
</script>