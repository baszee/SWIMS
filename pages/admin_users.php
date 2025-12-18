<!-- ============================================================================
FILE: pages/admin_users.php - FIXED & OPTIMIZED FOR 3PL WAREHOUSE
Version: 2.0 - Activity Logs Button Fixed + 3PL Enhancements
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <h2 style="margin:0;"> Manajemen Pengguna</h2>
            <p class="small" style="margin:5px 0 0 0;">Kelola akses sistem SWIMS untuk semua role (Admin, Staff, Supervisor, Owner)</p>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn success" onclick="showUserForm()">➕ Tambah User Baru</button>
            <button class="btn primary" onclick="loadPage('admin_activity_logs')">📋 Activity Logs</button>
        </div>
    </div>
</div>

<!-- Quick Stats -->
<div id="userStatsPanel" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
    <!-- Stats akan dimuat oleh init_admin_users() -->
</div>

<!-- User List Panel -->
<div id="userListPanel">
    <div class="card">
        <p style="text-align:center;">⏳ Memuat daftar pengguna...</p>
    </div>
</div>


<script>
// ========================================
// GLOBAL STATE
// ========================================
let currentUsersList = [];

// ========================================
// INIT FUNCTION
// ========================================
async function init_admin_users() {
    console.log('🚀 Init Admin Users Management v2.0');
    await loadUsersList();
}

// ========================================
// LOAD USERS LIST
// ========================================
async function loadUsersList() {
    const listDiv = document.getElementById('userListPanel');
    const statsDiv = document.getElementById('userStatsPanel');
    
    if (!listDiv) {
        console.error('❌ userListPanel element not found!');
        return;
    }
    
    listDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat data...</p></div>';
    showLoadingModal('Mengambil daftar pengguna...');
    
    try {
        console.log('📡 Fetching users from API...');
        const response = await fetch('api/admin_user.php');
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Data received:', data);
        
        if (!data.success) {
            listDiv.innerHTML = `
                <div class="card">
                    <p style="color:var(--danger); font-weight:600;">❌ Gagal: ${data.message}</p>
                </div>
            `;
            return;
        }

        currentUsersList = data.data;

        // Calculate statistics
        const totalUsers = currentUsersList.length;
        const activeUsers = currentUsersList.filter(u => u.is_active == 1).length;
        const inactiveUsers = currentUsersList.filter(u => u.is_active == 0).length;
        
        const roleCount = {
            admin: currentUsersList.filter(u => u.role === 'admin').length,
            staff: currentUsersList.filter(u => u.role === 'staff').length,
            supervisor: currentUsersList.filter(u => u.role === 'supervisor').length,
            owner: currentUsersList.filter(u => u.role === 'owner').length
        };

        // Render stats
        statsDiv.innerHTML = `
            <div class="stat-box" style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <div class="stat-label">Total Users</div>
                <div class="stat-value">${totalUsers}</div>
            </div>
            <div class="stat-box success">
                <div class="stat-label">Active</div>
                <div class="stat-value">${activeUsers}</div>
            </div>
            <div class="stat-box danger">
                <div class="stat-label">Inactive</div>
                <div class="stat-value">${inactiveUsers}</div>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <div class="stat-label">Admin</div>
                <div class="stat-value">${roleCount.admin}</div>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
                <div class="stat-label">Staff</div>
                <div class="stat-value">${roleCount.staff}</div>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Supervisor</div>
                <div class="stat-value">${roleCount.supervisor}</div>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <div class="stat-label">Owner</div>
                <div class="stat-value">${roleCount.owner}</div>
            </div>
        `;

        // Render table
        let tableHtml = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin:0;">📋 Daftar Pengguna Sistem</h3>
                    <input type="text" id="searchUsers" placeholder="🔍 Cari username..." 
                           style="max-width:300px; margin:0;" oninput="filterUsers()">
                </div>
                
                <table class="table" id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Terdaftar</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
        `;
        
        currentUsersList.forEach(user => {
            tableHtml += renderUserRow(user);
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        listDiv.innerHTML = tableHtml;

        console.log('✅ Users list rendered successfully');

    } catch (error) {
        console.error('❌ Load users error:', error);
        listDiv.innerHTML = `
            <div class="card">
                <h3 style="color:var(--danger); margin-top:0;">❌ Error Memuat Data</h3>
                <p style="color:var(--danger);">${error.message}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:6px; margin:15px 0;">
                    <h4 style="margin-top:0;">🔧 Troubleshooting:</h4>
                    <ol class="small">
                        <li>Pastikan WAMP/XAMPP sudah running</li>
                        <li>Cek database 'swims_db' di phpMyAdmin</li>
                        <li>Cek file <code>api/admin_user.php</code> tersedia</li>
                        <li>Periksa Console (F12) untuk detail error</li>
                    </ol>
                </div>
                <button class="btn primary" onclick="loadUsersList()">🔄 Coba Lagi</button>
            </div>
        `;
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// RENDER USER ROW
// ========================================
function renderUserRow(user) {
    const statusBadge = user.is_active == 1 
        ? '<span class="badge badge-success">✅ Aktif</span>' 
        : '<span class="badge badge-danger">⛔ Non-aktif</span>';
    
    const currentUserName = currentUser()?.username || '';
    const isSelf = user.username === currentUserName;
    
    // Role color coding
    const roleColors = {
        'admin': '#3b82f6',
        'staff': '#8b5cf6',
        'supervisor': '#ec4899',
        'owner': '#10b981'
    };
    const roleColor = roleColors[user.role] || '#6b7280';
    
    // Action buttons
    let actionButtons = `
        <button class="btn primary btn-sm" onclick='showUserForm(${JSON.stringify(user).replace(/'/g, "\\'")})'> ✏️ Edit</button>
    `;
    
    // Delete button conditions
    const roleCount = currentUsersList.filter(u => u.role === user.role && u.is_active == 1).length;
    const isLastActiveInRole = user.is_active == 1 && roleCount <= 1 && (user.role === 'admin' || user.role === 'supervisor');
    
    if (!isSelf && !isLastActiveInRole) {
        actionButtons += ` <button class="btn danger btn-sm" onclick="deleteUserPermanently(${user.id}, '${user.username}', '${user.role}')"> 🗑️ Delete</button>`;
    }
    
    if (isSelf) {
        actionButtons += ' <span class="badge" style="font-size:0.7rem; background:#8b5cf6;">YOU</span>';
    }

    return `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td><span class="role-badge" style="background:${roleColor};">${user.role.toUpperCase()}</span></td>
            <td>${statusBadge}</td>
            <td class="small">${user.created_at.substring(0, 10)}</td>
            <td>${actionButtons}</td>
        </tr>
    `;
}

// ========================================
// FILTER USERS (SEARCH)
// ========================================
function filterUsers() {
    const searchInput = document.getElementById('searchUsers');
    const query = searchInput.value.toLowerCase();
    const tbody = document.getElementById('usersTableBody');
    
    if (!query) {
        // Show all users
        tbody.innerHTML = currentUsersList.map(u => renderUserRow(u)).join('');
        return;
    }
    
    // Filter users
    const filtered = currentUsersList.filter(u => 
        u.username.toLowerCase().includes(query) || 
        u.role.toLowerCase().includes(query)
    );
    
    tbody.innerHTML = filtered.map(u => renderUserRow(u)).join('');
}

// ========================================
// SHOW USER FORM (CREATE/EDIT)
// ========================================
function showUserForm(user = null) {
    const isEdit = user !== null;
    let title = isEdit ? '✏️ Edit Pengguna' : '➕ Tambah Pengguna Baru';
    
    let roles = ['admin', 'staff', 'supervisor', 'owner'];
    let roleOptions = roles.map(r => 
        `<option value="${r}" ${isEdit && user.role === r ? 'selected' : ''}>${r.toUpperCase()}</option>`
    ).join('');

    let formHtml = `
        <div class="card">
            <h3>${title}</h3>
            <form id="formUserManagement">
                ${isEdit ? `<input type="hidden" id="userId" value="${user.id}">` : ''}
                
                <label>Username <span style="color:red;">*</span></label>
                <input type="text" id="username" value="${isEdit ? user.username : ''}" required ${isEdit ? 'disabled' : ''}>
                ${isEdit ? `<p class="small" style="margin:5px 0; color:var(--muted);">Username tidak dapat diubah setelah dibuat.</p>` : ''}
                
                <label>Role <span style="color:red;">*</span></label>
                <select id="userRole" required>
                    ${roleOptions}
                </select>
                
                <label>${isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password'} ${isEdit ? '' : '<span style="color:red;">*</span>'}</label>
                <input type="password" id="userPassword" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Kosongkan jika tidak diubah' : 'Default: 123456'}">
                <p class="small" style="margin:5px 0; color:var(--muted);">
                    ${isEdit ? 'Biarkan kosong jika tidak ingin mengubah password.' : 'Default password adalah 123456. User harus mengganti setelah login pertama.'}
                </p>
                
                ${isEdit ? `
                    <label>Status Akun <span style="color:red;">*</span></label>
                    <select id="userActive">
                        <option value="true" ${user.is_active == 1 ? 'selected' : ''}>✅ Aktif (Dapat Login)</option>
                        <option value="false" ${user.is_active == 0 ? 'selected' : ''}>⛔ Non-aktif (Tidak Dapat Login)</option>
                    </select>
                    <p class="small" style="margin:5px 0; color:var(--warning);">
                        ⚠️ Gunakan status Non-aktif untuk suspend user sementara. Lebih aman daripada delete permanen.
                    </p>
                ` : ''}

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
                    <button type="button" class="btn" onclick="loadUsersList()">Batal</button>
                    <button type="submit" class="btn primary">${isEdit ? '💾 Simpan Perubahan' : '➕ Tambah User'}</button>
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

// ========================================
// SUBMIT USER FORM
// ========================================
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
            showMessageModal('✅ Sukses', data.message, false);
            setTimeout(() => {
                loadUsersList();
            }, 1000);
        } else {
            showMessageModal('❌ Gagal', data.message, false);
        }
    } catch (error) {
        showMessageModal('Error', 'Gagal terhubung ke server: ' + error.message, false);
        console.error('Submit user form error:', error);
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// DELETE USER PERMANENTLY
// ========================================
function deleteUserPermanently(id, username, role) {
    // Count active users in same role
    const sameRoleActive = currentUsersList.filter(u => 
        u.role === role && u.is_active == 1
    ).length;
    
    // Additional safety check
    let warningMessage = '';
    if ((role === 'admin' || role === 'supervisor') && sameRoleActive <= 1) {
        showMessageModal(
            '⛔ Tidak Dapat Menghapus',
            `User ini adalah ${role} terakhir yang aktif. Minimal 1 ${role} harus selalu ada di sistem.`,
            false
        );
        return;
    }
    
    showMessageModal(
        '⚠️ Konfirmasi Hapus Permanen',
        `
        <div style="text-align:left;">
            <p><strong style="color:var(--danger);">PERINGATAN! Aksi ini TIDAK DAPAT dibatalkan!</strong></p>
            <p>Anda akan menghapus user <strong>${username}</strong> (${role}) secara permanen dari database.</p>
            
            <div style="background:#fee2e2; padding:12px; border-radius:6px; border-left:4px solid var(--danger); margin:15px 0;">
                <h4 style="margin:0 0 8px 0; color:var(--danger);">Konsekuensi:</h4>
                <ul style="margin:0; padding-left:20px; font-size:0.9rem;">
                    <li>Data user akan <strong>terhapus permanen</strong></li>
                    <li>Activity logs akan kehilangan referensi user</li>
                    <li>Transaksi yang dibuat tetap ada (untuk audit trail)</li>
                </ul>
            </div>
            
            <div style="background:#dbeafe; padding:12px; border-radius:6px; border-left:4px solid var(--primary); margin:15px 0;">
                <h4 style="margin:0 0 8px 0; color:#1e40af;">💡 Alternatif Lebih Aman:</h4>
                <p style="margin:0; font-size:0.9rem;">
                    Gunakan <strong>Edit → Status Non-aktif</strong> jika hanya ingin menonaktifkan sementara.
                    User tidak bisa login tapi datanya tetap aman.
                </p>
            </div>
            
            <p style="margin-top:15px; font-weight:600; color:var(--danger);">
                Yakin ingin melanjutkan penghapusan permanen?
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
                console.log('Delete response:', text);
                
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    throw new Error('Server mengembalikan response tidak valid: ' + text.substring(0, 100));
                }
                
                if (data.success) {
                    showMessageModal('✅ Sukses', `User ${username} berhasil dihapus secara permanen.`, false);
                    setTimeout(() => {
                        loadUsersList();
                    }, 1500);
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', 'Gagal menghapus user: ' + error.message, false);
                console.error('Delete user error:', error);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_admin_users = init_admin_users;
window.loadUsersList = loadUsersList;
window.showUserForm = showUserForm;
window.submitUserForm = submitUserForm;
window.deleteUserPermanently = deleteUserPermanently;
window.filterUsers = filterUsers;

console.log('✅ Admin Users Management Module v2.0 loaded (FIXED)');
</script>