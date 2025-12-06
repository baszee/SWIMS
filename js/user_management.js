/**
 * =========================================================
 * USER_MANAGEMENT.JS - USER MANAGEMENT MODULE
 * Menangani CRUD User untuk Administrator
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
                    <label>Status</label>
                    <select id="userActive">
                        <option value="true" ${user.is_active == 1 ? 'selected' : ''}>Aktif</option>
                        <option value="false" ${user.is_active == 0 ? 'selected' : ''}>Non-aktif</option>
                    </select>
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
    
    // Atur payload untuk CREATE atau UPDATE
    if (isEdit) {
        const id = document.getElementById('userId').value;
        const is_active = document.getElementById('userActive').value === 'true';
        
        payload.id = id;
        payload.is_active = is_active;
        
        if (password) {
            payload.new_password = password;
        }
    } else {
        // CREATE: password wajib atau gunakan default
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
            showMessageModal('✅ Sukses', data.message, false);
            // Delay untuk memberi waktu user membaca pesan
            setTimeout(() => {
                init_admin_users(); // Muat ulang daftar user
            }, 1000);
        } else {
            showMessageModal('❌ Gagal', data.message, false);
        }
    } catch (error) {
        showMessageModal('Error Jaringan', 'Gagal terhubung ke API User Management: ' + error.message, false);
        console.error('User form submit error:', error);
    } finally {
        hideLoadingModal();
    }
}

// Fungsi untuk menonaktifkan User
function deactivateUser(id, username) {
    showMessageModal(
        'Konfirmasi Non-aktif',
        `Yakin ingin menonaktifkan akun <b>${username}</b>? Akun tidak dapat login lagi.`,
        true,
        async () => {
            showLoadingModal('Menonaktifkan user...');
            try {
                const response = await fetch(`api/admin_user.php?id=${id}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    showMessageModal('✅ Sukses', data.message, false);
                    setTimeout(() => {
                        init_admin_users(); // Muat ulang daftar
                    }, 1000);
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error Jaringan', 'Gagal menonaktifkan akun: ' + error.message, false);
                console.error('Deactivate user error:', error);
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
        // PERBAIKAN: Gunakan nama file yang benar (admin_user.php TANPA 'S')
        console.log('Mencoba fetch ke api/admin_user.php...');
        const response = await fetch('api/admin_user.php');
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        // Cek apakah response OK
        if (!response.ok) {
            // Coba baca response sebagai text untuk debugging
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

        let tableHtml = `
            <div class="card">
                <h3>Daftar Pengguna SWIMS</h3>
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
            const deactivateButton = (user.is_active == 1 && user.username !== currentUserName) ? 
                `<button class="btn danger btn-sm" onclick="deactivateUser(${user.id}, '${user.username}')">Non-aktifkan</button>` 
                : '';

            // Escape single quotes dalam JSON untuk onclick
            const userJson = JSON.stringify(user).replace(/'/g, "\\'");
            
            tableHtml += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td><span class="role-badge">${user.role}</span></td>
                    <td>${statusBadge}</td>
                    <td>${user.created_at.substring(0, 10)}</td>
                    <td>
                        <button class="btn primary btn-sm" onclick='showUserForm(${userJson})'>Edit</button>
                        ${deactivateButton}
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        listDiv.innerHTML = tableHtml;

    } catch (error) {
        listDiv.innerHTML = `
            <div class="card">
                <p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p>
                <p class="small">Pastikan:</p>
                <ul class="small">
                    <li>WAMP/XAMPP sudah berjalan</li>
                    <li>File api/admin_users.php tersedia</li>
                    <li>Database sudah terkonfigurasi dengan benar</li>
                </ul>
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
window.deactivateUser = deactivateUser;

console.log('User Management Module loaded ✅');