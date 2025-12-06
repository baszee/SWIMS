/**
 * =========================================================
 * NOTES.JS - NOTES MODULE FOR SUPERVISOR & OWNER
 * Version: 1.0 - Complete with messaging system
 * =========================================================
 */

// ========================================
// INIT NOTES PAGE
// ========================================
function init_notes() {
    console.log('🚀 Init Notes Page v1.0');
    loadNotesList();
    loadNotaHistory();
}

// ========================================
// LOAD NOTES LIST
// ========================================
async function loadNotesList() {
    const listDiv = document.getElementById('notesList');
    if (!listDiv) {
        console.error('notesList div not found!');
        return;
    }
    
    listDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat catatan...</p></div>';
    
    try {
        console.log('Fetching notes from API...');
        const response = await fetch('api/notes.php');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Notes data received:', data);
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">❌ Gagal: ${data.message}</p></div>`;
            return;
        }

        if (data.data.length === 0) {
            listDiv.innerHTML = `
                <div class="card" style="text-align:center; padding:30px;">
                    <p style="font-size:3rem; margin:0;">📝</p>
                    <p style="color:var(--muted);">Tidak ada catatan internal saat ini.</p>
                    <button class="btn success" onclick="showNoteForm()">+ Buat Catatan Pertama</button>
                </div>
            `;
            return;
        }
        
        let html = '<div class="card"><h3>Daftar Catatan Terkini</h3>';
        
        const currentUserName = currentUser().username;
        const currentUserRole = currentUser().role;
        
        data.data.forEach(note => {
            const isDeletable = note.created_by === currentUserName || currentUserRole === 'owner';
            
            // Target badge
            let targetBadge = '';
            if (note.created_for_role === 'all') {
                targetBadge = '<span class="badge" style="background:#dbeafe; color:#1e40af;">Semua</span>';
            } else if (note.created_for_role === 'supervisor') {
                targetBadge = '<span class="badge" style="background:#fef3c7; color:#92400e;">Supervisor</span>';
            } else {
                targetBadge = '<span class="badge" style="background:#dcfce7; color:#166534;">Owner</span>';
            }
            
            html += `
                <div class="card" style="margin-bottom:12px; border-left:4px solid var(--primary);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h4 style="margin:0; color:var(--primary);">${note.title}</h4>
                        ${isDeletable ? `<button class="btn danger btn-sm" onclick="deleteNote(${note.id})">🗑️ Hapus</button>` : ''}
                    </div>
                    <p class="small" style="margin:5px 0 10px 0;">
                        Dari: <b>${note.created_by}</b> ${targetBadge} | 
                        ${note.created_at.substring(0, 16)}
                    </p>
                    <p style="margin:0; white-space: pre-wrap;">${note.content}</p>
                </div>
            `;
        });

        listDiv.innerHTML = html + '</div>';
        console.log('✅ Notes list rendered');

    } catch (error) {
        console.error('Load notes error:', error);
        listDiv.innerHTML = `
            <div class="card">
                <p style="color:var(--danger);">❌ Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadNotesList()">🔄 Coba Lagi</button>
            </div>
        `;
    }
}

// ========================================
// LOAD NOTA HISTORY
// ========================================
async function loadNotaHistory() {
    const historyDiv = document.getElementById('notaHistoryList');
    if (!historyDiv) {
        console.error('notaHistoryList div not found!');
        return;
    }
    
    historyDiv.innerHTML = '<p style="text-align:center;">⏳ Memuat riwayat...</p>';
    
    try {
        console.log('Fetching nota history...');
        const response = await fetch('api/report.php?action=history');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Nota history data:', data);
        
        if (!data.success || data.data.length === 0) {
            historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Tidak ada nota transaksi yang sudah approved.</p>';
            return;
        }
        
        // Filter hanya APPROVED
        const approvedTransactions = data.data.filter(t => t.status === 'APPROVED');
        
        if (approvedTransactions.length === 0) {
            historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Belum ada transaksi yang approved.</p>';
            return;
        }
        
        let html = '<table class="table"><thead><tr>';
        html += '<th>No Nota</th><th>Type</th><th>Kode</th><th>Disetujui</th><th>Waktu</th><th>QR Code</th><th>Verifikasi</th></tr></thead><tbody>';
        
        approvedTransactions.forEach(t => {
            const notaNumber = `NOTE-${Date.now() + Math.floor(Math.random() * 1000)}`;
            const typeBadge = t.type === 'IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
            const qrId = `qr-${t.id}`;
            
            html += `
                <tr>
                    <td>${notaNumber.substring(0, 18)}...</td>
                    <td>${typeBadge}</td>
                    <td>${t.transaction_code}</td>
                    <td>${t.approver || 'System'}</td>
                    <td>${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                    <td>
                        <div id="${qrId}" style="display:inline-block;"></div>
                    </td>
                    <td>
                        <button class="btn primary btn-sm" onclick="quickVerify('${t.transaction_code}')">🔍 Verify</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        historyDiv.innerHTML = html;
        
        // Generate QR Codes setelah HTML dimuat
        setTimeout(() => {
            approvedTransactions.forEach(t => {
                const qrId = `qr-${t.id}`;
                const qrDiv = document.getElementById(qrId);
                if (qrDiv && typeof QRCode !== 'undefined') {
                    const qrData = `TXN-${t.transaction_code}|STATUS-APPROVED`;
                    new QRCode(qrDiv, {
                        text: qrData,
                        width: 60,
                        height: 60
                    });
                }
            });
            console.log('✅ QR Codes generated');
        }, 100);
        
    } catch (error) {
        console.error('Load nota history error:', error);
        historyDiv.innerHTML = `
            <div class="card">
                <p style="color:var(--danger);">Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadNotaHistory()">🔄 Coba Lagi</button>
            </div>
        `;
    }
}

// ========================================
// SHOW NOTE FORM
// ========================================
function showNoteForm() {
    console.log('📝 Showing note form');
    const listDiv = document.getElementById('notesList');
    
    let formHtml = `
        <div class="card">
            <h3>Buat Catatan Baru</h3>
            <form id="formNoteManagement">
                <label>Judul Catatan <span style="color:red;">*</span></label>
                <input type="text" id="noteTitle" required placeholder="Judul catatan...">
                
                <label>Isi Catatan <span style="color:red;">*</span></label>
                <textarea id="noteContent" rows="5" required placeholder="Tulis catatan Anda di sini..."></textarea>
                
                <label>Kirim Ke <span style="color:red;">*</span></label>
                <select id="noteTargetRole" required>
                    <option value="all">Semua (Supervisor & Owner)</option>
                    <option value="supervisor">Hanya Supervisor</option>
                    <option value="owner">Hanya Owner</option>
                </select>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                    <button type="button" class="btn" onclick="loadNotesList()">Batal</button>
                    <button type="submit" class="btn primary">📤 Kirim Catatan</button>
                </div>
            </form>
        </div>
    `;

    listDiv.innerHTML = formHtml;
    
    document.getElementById('formNoteManagement').onsubmit = async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const target_role = document.getElementById('noteTargetRole').value;
        
        if (!title || !content) {
            showMessageModal('Validasi', 'Judul dan Isi catatan wajib diisi!', false);
            return;
        }
        
        const payload = {
            title: title,
            content: content,
            target_role: target_role,
        };
        
        console.log('Sending note:', payload);
        showLoadingModal('Mengirim catatan...');
        
        try {
            const response = await fetch('api/notes.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Send note response:', data);
            
            if (data.success) {
                showMessageModal('✅ Sukses', 'Catatan berhasil dikirim!', false);
                setTimeout(() => init_notes(), 1000);
            } else {
                showMessageModal('❌ Gagal', data.message, false);
            }
        } catch (error) {
            console.error('Send note error:', error);
            showMessageModal('Error', 'Gagal mengirim catatan: ' + error.message, false);
        } finally {
            hideLoadingModal();
        }
    };
}

// ========================================
// DELETE NOTE
// ========================================
function deleteNote(id) {
    console.log('🗑️ Deleting note:', id);
    showMessageModal(
        'Konfirmasi Hapus',
        'Apakah Anda yakin ingin menghapus catatan ini?',
        true,
        async () => {
            showLoadingModal('Menghapus...');
            try {
                const response = await fetch(`api/notes.php?id=${id}`, { method: 'DELETE' });
                const data = await response.json();
                
                console.log('Delete note response:', data);
                
                if (data.success) {
                    showMessageModal('✅ Sukses', 'Catatan berhasil dihapus!', false);
                    setTimeout(() => loadNotesList(), 1000);
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                console.error('Delete note error:', error);
                showMessageModal('Error', 'Gagal menghapus: ' + error.message, false);
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

    console.log('🔍 Verifying transaction:', txnCode);
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
            resultDiv.innerHTML = `✅ <strong>VERIFIKASI BERHASIL!</strong><br>
                <span class="small">Kode: ${transaction.transaction_code} (${transaction.type}) | Item: ${transaction.item_name}<br>
                Status: ${transaction.status} | Disetujui: ${transaction.approver}</span>`;
            resultDiv.style.color = 'var(--success)';
            console.log('✅ Verification successful');
        } else if (transaction) {
            resultDiv.innerHTML = `⚠️ Transaksi ditemukan tapi status: ${transaction.status}`;
            resultDiv.style.color = 'var(--warning)';
            console.log('⚠️ Transaction found but not approved');
        } else {
            resultDiv.textContent = '❌ Kode transaksi tidak ditemukan.';
            resultDiv.style.color = 'var(--danger)';
            console.log('❌ Transaction not found');
        }
        
    } catch (error) {
        console.error('Verify error:', error);
        resultDiv.textContent = '❌ Error: ' + error.message;
        resultDiv.style.color = 'var(--danger)';
    } finally {
        hideLoadingModal();
    }
}

// Quick verify from table
function quickVerify(txnCode) {
    console.log('⚡ Quick verify:', txnCode);
    document.getElementById('verifyTxnCode').value = txnCode;
    verifyTransactionQr();
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_notes = init_notes;
window.loadNotesList = loadNotesList;
window.loadNotaHistory = loadNotaHistory;
window.showNoteForm = showNoteForm;
window.deleteNote = deleteNote;
window.verifyTransactionQr = verifyTransactionQr;
window.quickVerify = quickVerify;

console.log('✅ Notes Module v1.0 loaded');