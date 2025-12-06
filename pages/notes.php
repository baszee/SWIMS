<!-- FILE: pages/notes.php -->
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

<!-- Daftar Nota Transaksi (History) -->
<div class="card">
    <h3>📋 Daftar Nota Transaksi</h3>
    <p class="small">Nota dikeluarkan otomatis setelah Supervisor approve transaksi. QR code berisi signature untuk verifikasi.</p>
    
    <div id="notaHistoryList">
        <p style="text-align:center;">⏳ Memuat riwayat nota...</p>
    </div>
</div>

<!-- Verifikasi QR Code Section -->
<div class="card" style="border-left: 4px solid var(--primary);">
    <h3>🔍 Audit Verifikasi Transaksi (Simulasi QR Code)</h3>
    <p class="small">Supervisor dapat mengeluarkan Nota Transaksi. Owner/Supervisor dapat memverifikasi QR Code Nota di sini.</p>
    <label>ID Transaksi yang diverifikasi</label>
    <input type="text" id="verifyTxnCode" placeholder="Contoh: TXN-176481365495">
    <button class="btn primary" onclick="verifyTransactionQr()">Verifikasi Nota</button>
    <div id="verificationResult" style="margin-top: 15px; font-weight: 600;"></div>
</div>

<script>
    // ========================================
    // INIT NOTES PAGE
    // ========================================
    window.init_notes = function() {
        loadNotesList();
        loadNotaHistory();
    }
    
    // ========================================
    // LOAD NOTES LIST
    // ========================================
    async function loadNotesList() {
        const listDiv = document.getElementById('notesList');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div class="card"><p>Memuat catatan...</p></div>';
        
        try {
            const response = await fetch('api/notes.php');
            const data = await response.json();
            
            if (!data.success) {
                listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">Gagal: ${data.message}</p></div>`;
                return;
            }

            if (data.data.length === 0) {
                listDiv.innerHTML = '<div class="card"><p>Tidak ada catatan internal saat ini.</p></div>';
                return;
            }
            
            let html = '<div class="card"><h3>Daftar Catatan Terkini</h3>';
            
            data.data.forEach(note => {
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
            listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">Error: ${error.message}</p></div>`;
        }
    }
    
    // ========================================
    // LOAD NOTA HISTORY
    // ========================================
    async function loadNotaHistory() {
        const historyDiv = document.getElementById('notaHistoryList');
        if (!historyDiv) return;
        
        try {
            const response = await fetch('api/report.php?action=history');
            const data = await response.json();
            
            if (!data.success || data.data.length === 0) {
                historyDiv.innerHTML = '<p style="text-align:center;">Tidak ada nota transaksi yang sudah approved.</p>';
                return;
            }
            
            // Filter hanya APPROVED
            const approvedTransactions = data.data.filter(t => t.status === 'APPROVED');
            
            if (approvedTransactions.length === 0) {
                historyDiv.innerHTML = '<p style="text-align:center;">Belum ada transaksi yang approved.</p>';
                return;
            }
            
            let html = '<table class="table"><thead><tr>';
            html += '<th>No Nota</th><th>Type</th><th>Txn</th><th>Issued By</th><th>Waktu</th><th>QR Code</th><th>Verifikasi</th></tr></thead><tbody>';
            
            approvedTransactions.forEach(t => {
                const notaNumber = `NOTE-${Date.now() + Math.random()}`;
                const typeBadge = t.type === 'IN' ? '<span class="badge-in">MASUK</span>' : '<span class="badge-out">KELUAR</span>';
                const qrData = `TXN-${t.transaction_code}|STATUS-APPROVED`;
                
                html += `
                    <tr>
                        <td>${notaNumber.substring(0, 18)}</td>
                        <td>${typeBadge}</td>
                        <td>${t.transaction_code}</td>
                        <td>${t.approver || 'System'}</td>
                        <td>${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                        <td>
                            <div id="qr-${t.id}" style="display:inline-block;"></div>
                            <script>
                                if (typeof QRCode !== 'undefined') {
                                    new QRCode(document.getElementById('qr-${t.id}'), {
                                        text: '${qrData}',
                                        width: 60,
                                        height: 60
                                    });
                                }
                            </script>
                        </td>
                        <td>
                            <button class="btn primary btn-sm" onclick="quickVerify('${t.transaction_code}')">🔍 Verify</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            historyDiv.innerHTML = html;
            
        } catch (error) {
            historyDiv.innerHTML = `<p style="color:var(--danger);">Error: ${error.message}</p>`;
        }
    }
    
    // ========================================
    // SHOW NOTE FORM
    // ========================================
    function showNoteForm() {
        const listDiv = document.getElementById('notesList');
        
        let formHtml = `
            <div class="card">
                <h3>Buat Catatan Baru</h3>
                <form id="formNoteManagement">
                    <label>Judul Catatan</label>
                    <input type="text" id="noteTitle" required>
                    
                    <label>Isi Catatan</label>
                    <textarea id="noteContent" rows="5" required></textarea>
                    
                    <label>Target Role</label>
                    <select id="noteTargetRole" required>
                        <option value="all">Semua (Supervisor & Owner)</option>
                        <option value="supervisor">Hanya Supervisor</option>
                        <option value="owner">Hanya Owner</option>
                    </select>

                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                        <button type="button" class="btn" onclick="loadNotesList()">Batal</button>
                        <button type="submit" class="btn primary">Buat Catatan</button>
                    </div>
                </form>
            </div>
        `;

        listDiv.innerHTML = formHtml;
        
        document.getElementById('formNoteManagement').onsubmit = async function(e) {
            e.preventDefault();
            
            const payload = {
                title: document.getElementById('noteTitle').value,
                content: document.getElementById('noteContent').value,
                target_role: document.getElementById('noteTargetRole').value,
            };
            
            showLoadingModal('Memposting catatan...');
            
            try {
                const response = await fetch('api/notes.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (data.success) {
                    showMessageModal('✅ Sukses', data.message, false);
                    setTimeout(() => init_notes(), 1000);
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', error.message, false);
            } finally {
                hideLoadingModal();
            }
        };
    }
    
    // ========================================
    // DELETE NOTE
    // ========================================
    function deleteNote(id) {
        showMessageModal(
            'Konfirmasi Hapus',
            'Apakah Anda yakin ingin menghapus catatan ini?',
            true,
            async () => {
                showLoadingModal('Menghapus...');
                try {
                    const response = await fetch(`api/notes.php?id=${id}`, { method: 'DELETE' });
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessageModal('✅ Sukses', data.message, false);
                        setTimeout(() => loadNotesList(), 1000);
                    } else {
                        showMessageModal('❌ Gagal', data.message, false);
                    }
                } catch (error) {
                    showMessageModal('Error', error.message, false);
                } finally {
                    hideLoadingModal();
                }
            }
        );
    }
    
    // ========================================
    // VERIFY TRANSACTION QR
    // ========================================
    async function verifyTransactionQr() {
        const txnCode = document.getElementById('verifyTxnCode').value.trim();
        const resultDiv = document.getElementById('verificationResult');
        
        if (!txnCode) {
            resultDiv.textContent = '⚠️ Masukkan kode transaksi!';
            resultDiv.style.color = 'var(--warning)';
            return;
        }

        showLoadingModal('Memverifikasi...');
        
        try {
            const response = await fetch(`api/report.php?action=history`);
            const data = await response.json();

            if (!data.success) {
                resultDiv.textContent = '❌ Gagal mengambil data.';
                resultDiv.style.color = 'var(--danger)';
                return;
            }
            
            const transaction = data.data.find(t => t.transaction_code === txnCode);
            
            if (transaction && transaction.status === 'APPROVED') {
                resultDiv.innerHTML = `✅ **VERIFIKASI BERHASIL!**<br>
                    <span class="small">Kode: ${transaction.transaction_code} (${transaction.type}) | Item: ${transaction.item_name}<br>
                    Status: ${transaction.status} | Disetujui Oleh: ${transaction.approver}</span>`;
                resultDiv.style.color = 'var(--success)';
            } else if (transaction) {
                resultDiv.innerHTML = `⚠️ Transaksi ditemukan tapi status: ${transaction.status}`;
                resultDiv.style.color = 'var(--warning)';
            } else {
                resultDiv.textContent = '❌ Kode transaksi tidak ditemukan.';
                resultDiv.style.color = 'var(--danger)';
            }
            
        } catch (error) {
            resultDiv.textContent = '❌ Error: ' + error.message;
            resultDiv.style.color = 'var(--danger)';
        } finally {
            hideLoadingModal();
        }
    }
    
    // Quick verify from table
    function quickVerify(txnCode) {
        document.getElementById('verifyTxnCode').value = txnCode;
        verifyTransactionQr();
    }
    
    // Expose functions
    window.showNoteForm = showNoteForm;
    window.deleteNote = deleteNote;
    window.verifyTransactionQr = verifyTransactionQr;
    window.quickVerify = quickVerify;
</script>