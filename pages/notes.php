<!-- FILE: pages/notes.php - UPDATED VERSION (Notes Only) -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📝 Daftar Catatan Internal</h2>
        <button class="btn success" onclick="showNoteForm()">+ Buat Catatan</button>
    </div>
    <p class="small">Digunakan untuk komunikasi penting antar Supervisor dan Owner.</p>
</div>

<div id="notesList">
    <!-- Daftar Notes akan dimuat di sini -->
    <div class="card">
        <p style="text-align:center;">⏳ Memuat catatan...</p>
    </div>
</div>

<script>
// ========================================
// INIT NOTES PAGE (Notes Only)
// ========================================
function init_notes() {
    console.log('🚀 Init Notes Page v2.0 (Notes Only)');
    loadNotesList();
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
// EXPOSE TO GLOBAL
// ========================================
window.init_notes = init_notes;
window.loadNotesList = loadNotesList;
window.showNoteForm = showNoteForm;
window.deleteNote = deleteNote;

console.log('✅ Notes Module v2.0 loaded (Notes Only)');
</script>