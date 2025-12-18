/**
 * =========================================================
 * USER_MANAGEMENT.JS - SIMPLE VERSION
 * Features: CREATE, EDIT (dengan status), DELETE
 * UI: Text only buttons (Edit & Delete)
 * =========================================================
 */

// Fungsi untuk menampilkan form Tambah/Edit User
function showUserForm(user = null) {
    const isEdit = user !== null;
    let title = isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru';
    
    let roles = ['admin', 'staff', 'supervisor', 'owner'];
    let roleOptions = roles.map(r => 
        `<option value="${r}" ${isEdit && user.role === r ? 'selected' : ''}>${r.toUpperCase()}</option>`
    ).join('');

    let formHtml = `
        <div class="card">
            <h3>${title}</h3>
            <form id="formUserManagement">
                ${isEdit ? `<input type="hidden" id="userId" value="${user.id}">` : ''}
                
                <label>Username</label>
                <input type="text" id="username" value="${isEdit ? user.username : ''}" required ${isEdit ? 'disabled' : ''}>
                ${isEdit ? `<p class="small" style="margin:5px 0;">Username tidak bisa diubah.</p>` : ''}
                
                <label>Role</label>
                <select id="userRole" required>
                    ${roleOptions}
                </select>
                
                <label>${isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password'}</label>
                <input type="password" id="userPassword" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}">
                
                ${isEdit ? `
                    <label>Status Akun</label>
                    <select id="userActive">
                        <option value="true" ${user.is_active == 1 ? 'selected' : ''}>Aktif (Dapat Login)</option>
                        <option value="false" ${user.is_active == 0 ? 'selected' : ''}>Non-aktif (Tidak Dapat Login)</option>
                    </select>
                    <p class="small" style="margin:5px 0; color:var(--muted);">Gunakan status Non-aktif untuk menonaktifkan akun sementara</p>
                ` : ''}

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                    <button type="button" class="btn" onclick="init_admin_users()">Batal</button>
                    <button type="submit" class="btn primary">${isEdit ? 'Simpan Perubahan' : 'Tambah User'}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('userListPanel').innerHTML = formHtml;
    
    // Setup Submit Handler
    document.getElementById('formUserManagement').onsubmit = function(e) {
        e.preventDefault();
        submitUserForm(isEdit);
    };
}

// Fungsi submit form ke API
async function submitUserForm(isEdit) {
    showLoadingModal('Memproses data pengguna...');
    
    const username = document.getElementById('username').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;

    let payload = {
        username: username,
        role: role,
    };
    
    if (isEdit) {
        const id = document.getElementById('userId').value;
        const is_active = document.getElementById('userActive').value === 'true';
        
        payload.id = id;
        payload.is_active = is_active;
        
        if (password) {
            payload.new_password = password;
        }
    } else {
        payload.password = password || '123456';
    }

    try {
        const response = await fetch('api/admin_user.php', {
            method: isEdit ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.success) {
            showMessageModal('Sukses', data.message, false);
            setTimeout(() => {
                init_admin_users();
            }, 1000);
        } else {
            showMessageModal('Gagal', data.message, false);
        }
    } catch (error) {
        showMessageModal('Error Jaringan', 'Gagal terhubung ke API User Management: ' + error.message, false);
        console.error('User form submit error:', error);
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// DELETE USER FUNCTION
// ========================================
function deleteUserPermanently(id, username) {
    showMessageModal(
        'Konfirmasi Hapus',
        `
        <div style="text-align:left;">
            <p><strong style="color:var(--danger);">PERHATIAN! Aksi ini tidak dapat dibatalkan!</strong></p>
            <p>Anda akan menghapus akun <strong>${username}</strong> secara permanen dari database.</p>
            <ul style="margin:10px 0; padding-left:20px; color:var(--danger);">
                <li>Semua data user akan terhapus</li>
                <li>History activity akan kehilangan referensi user</li>
                <li>Transaksi yang dibuat user tetap ada (untuk audit)</li>
            </ul>
            <p style="margin-top:15px; padding:10px; background:#fee2e2; border-radius:6px; border-left:4px solid var(--danger);">
                <strong>Alternatif:</strong> Gunakan Edit > Status Non-aktif jika hanya ingin menonaktifkan sementara.
            </p>
        </div>
        `,
        true,
        async () => {
            showLoadingModal('Menghapus user...');
            try {
                const response = await fetch(`api/admin_user.php?id=${id}&permanent=true`, {
                    method: 'DELETE'
                });
                
                const text = await response.text();
                console.log('Delete response text:', text);
                
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    console.error('Response was:', text);
                    throw new Error('Server returned invalid JSON: ' + text.substring(0, 100));
                }
                
                if (data.success) {
                    showMessageModal('Sukses', 'User berhasil dihapus secara permanen.', false);
                    setTimeout(() => {
                        init_admin_users();
                    }, 1500);
                } else {
                    showMessageModal('Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', 'Gagal menghapus user: ' + error.message, false);
                console.error('Delete user permanently error:', error);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// Fungsi utama init_admin_users (Memuat Tabel)
async function init_admin_users() {
    const listDiv = document.getElementById('userListPanel');
    if (!listDiv) {
        console.error('Element userListPanel tidak ditemukan!');
        return;
    }
    
    listDiv.innerHTML = '<div class="card"><p>Memuat daftar pengguna...</p></div>';
    showLoadingModal('Mengambil daftar pengguna...');
    
    try {
        console.log('Mencoba fetch ke api/admin_user.php...');
        const response = await fetch('api/admin_user.php');
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data received:', data);
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        // Hitung statistik
        const totalUsers = data.data.length;
        const activeUsers = data.data.filter(u => u.is_active == 1).length;
        const inactiveUsers = data.data.filter(u => u.is_active == 0).length;
        
        const roleCount = {
            admin: data.data.filter(u => u.role === 'admin').length,
            staff: data.data.filter(u => u.role === 'staff').length,
            supervisor: data.data.filter(u => u.role === 'supervisor').length,
            owner: data.data.filter(u => u.role === 'owner').length
        };

        let tableHtml = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin:0;">Daftar Pengguna SWIMS</h3>
                    <div style="display:flex; gap:8px;">
                        <span class="badge" style="background:#10b981;">Aktif: ${activeUsers}</span>
                        <span class="badge" style="background:#ef4444;">Non-aktif: ${inactiveUsers}</span>
                        <span class="badge" style="background:#3b82f6;">Total: ${totalUsers}</span>
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Dibuat</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.data.forEach(user => {
            const statusBadge = user.is_active == 1 
                ? '<span class="badge badge-success">Aktif</span>' 
                : '<span class="badge badge-danger">Non-aktif</span>';
            
            const currentUserName = currentUser()?.username || '';
            const isSelf = user.username === currentUserName;
            
            // Button actions - SIMPLE TEXT ONLY
            let actionButtons = '';
            
            // Edit button (always available except for self if needed)
            actionButtons += `<button class="btn primary btn-sm" onclick='showUserForm(${JSON.stringify(user).replace(/'/g, "\\'")})'> Edit</button>`;
            
            // Delete button (only if not self and not last admin)
            const isLastAdmin = user.role === 'admin' && roleCount.admin === 1;
            if (!isSelf && !isLastAdmin) {
                actionButtons += ` <button class="btn danger btn-sm" onclick="deleteUserPermanently(${user.id}, '${user.username}')" style="background:#ef4444;"> Delete</button>`;
            }
            
            if (isSelf) {
                actionButtons += ' <span class="badge" style="font-size:0.7rem; background:#8b5cf6;">YOU</span>';
            }

            tableHtml += `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${user.username}</strong></td>
                    <td><span class="role-badge">${user.role}</span></td>
                    <td>${statusBadge}</td>
                    <td>${user.created_at.substring(0, 10)}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
        
        listDiv.innerHTML = tableHtml;

    } catch (error) {
        listDiv.innerHTML = `
            <div class="card">
                <p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p>
                <p class="small">Pastikan:</p>
                <ul class="small">
                    <li>WAMP/XAMPP sudah berjalan</li>
                    <li>File api/admin_user.php tersedia</li>
                    <li>Database sudah terkonfigurasi dengan benar</li>
                </ul>
                <button class="btn primary" onclick="init_admin_users()">Coba Lagi</button>
            </div>
        `;
        console.error('User list load error:', error);
    } finally {
        hideLoadingModal();
    }
}

// Expose functions ke global scope
window.init_admin_users = init_admin_users;
window.showUserForm = showUserForm;
window.submitUserForm = submitUserForm;
window.deleteUserPermanently = deleteUserPermanently;

console.log('✅ User Management Module loaded (SIMPLE VERSION)');