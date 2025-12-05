<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>👥 Manajemen Pengguna</h2>
        <button class="btn primary" onclick="showUserForm()">+ Tambah User Baru</button>
    </div>
    <p class="small">Administrator dapat menambah, mengubah role, dan menonaktifkan akun pengguna SWIMS.</p>
</div>

<div id="userListPanel">
    <!-- Konten tabel user akan di-load di sini oleh init_admin_users() -->
    <div class="card">
        <p>Memuat daftar pengguna...</p>
    </div>
</div>

<script>
    // Pastikan fungsi ini didefinisikan di js/app.js
    // Fungsi init_admin_users akan dipanggil saat halaman dimuat
    
    // ----------- Logika CRUD User di Sisi Frontend (JS) -----------

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
                    <input type="password" id="userPassword" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '********' : 'Default: 123456'}">
                    
                    ${isEdit ? `
                        <label>Status</label>
                        <select id="userActive">
                            <option value="true" ${user.is_active == 1 ? 'selected' : ''}>Aktif</option>
                            <option value="false" ${user.is_active == 0 ? 'selected' : ''}>Non-aktif</option>
                        </select>
                    ` : ''}

                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                        <button type="button" class="btn" onclick="loadPage('admin_users')">Batal</button>
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
        
        const id = document.getElementById('userId')?.value;
        const username = document.getElementById('username').value;
        const role = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value;
        const is_active = document.getElementById('userActive')?.value === 'true';

        let payload = {
            username: username,
            role: role,
        };
        
        // Atur payload untuk CREATE atau UPDATE
        if (isEdit) {
            payload.id = id;
            payload.is_active = is_active;
            if (password) {
                payload.new_password = password;
            }
        } else {
            if (password) {
                payload.password = password;
            }
        }

        try {
            const response = await fetch('api/admin_users.php', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses', data.message, false);
                loadPage('admin_users'); // Muat ulang halaman
            } else {
                showMessageModal('❌ Gagal', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API User Management.', false);
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
                    const response = await fetch(`api/admin_users.php?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessageModal('✅ Sukses', data.message, false);
                        loadPage('admin_users');
                    } else {
                        showMessageModal('❌ Gagal', data.message, false);
                    }
                } catch (error) {
                    showMessageModal('Error Jaringan', 'Gagal menonaktifkan akun.', false);
                } finally {
                    hideLoadingModal();
                }
            }
        );
    }

    // Fungsi utama init_admin_users (Memuat Tabel)
    window.init_admin_users = async function() {
        const listDiv = document.getElementById('userListPanel');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div class="card"><p>Memuat daftar pengguna...</p></div>';
        showLoadingModal('Mengambil daftar pengguna...');
        
        try {
            const response = await fetch('api/admin_users.php');
            const data = await response.json();
            
            if (!data.success) {
                listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
                return;
            }

            let tableHtml = '<div class="card"><h3>Daftar Pengguna SWIMS</h3><table class="table"><thead><tr>';
            tableHtml += '<th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>';
            
            data.data.forEach(user => {
                const statusBadge = user.is_active == 1 ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Non-aktif</span>';
                
                tableHtml += `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td><span class="role-badge">${user.role}</span></td>
                        <td>${statusBadge}</td>
                        <td>${user.created_at.substring(0, 10)}</td>
                        <td>
                            <button class="btn primary btn-sm" onclick='showUserForm(${JSON.stringify(user)})'>Edit</button>
                            ${user.is_active == 1 && user.username !== currentUser().username ? 
                                `<button class="btn danger btn-sm" onclick="deactivateUser(${user.id}, '${user.username}')">Non-aktifkan</button>` 
                                : ''
                            }
                        </td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table></div>';
            listDiv.innerHTML = tableHtml;

        } catch (error) {
            listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p></div>`;
            console.error('User list load error:', error);
        } finally {
            hideLoadingModal();
        }
    }
</script>