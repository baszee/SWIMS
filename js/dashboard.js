/**
 * =========================================================
 * DASHBOARD.JS - DASHBOARD MODULE
 * Menangani logika pemuatan data dan rendering dashboard
 * untuk semua peran (Staff, Supervisor, Admin, Owner).
 * =========================================================
 */

/* init_staff - Dashboard Staff */
function init_staff(){
    // Memuat Master Data sebelum memuat Dashboard
    loadMasterData().then(loadStaffDashboard); 
}

// Fungsi untuk memuat statistik dashboard Staff
async function loadStaffDashboard() {
    const statsDiv = document.getElementById('staffStats');
    const user = currentUser();
    
    if (!statsDiv) return;

    // Tambahkan welcome text
    document.getElementById('staffWelcome').innerHTML = `Selamat datang, <b>${user.username}</b>. Gunakan menu untuk mengelola barang.`;
    statsDiv.innerHTML = '';
    showLoadingModal('Mengambil statistik Staff...');

    try {
        const response = await fetch('api/report.php?action=staff_summary');
        const data = await response.json();
        
        if (!data.success) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        const stats = data.data;

        // Rendering 4 Kartu Statistik
        statsDiv.innerHTML = `
            <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="stat-label">Total Jenis Barang (Approved)</div>
                <div class="stat-value">${stats.total_items.toLocaleString()}</div>
            </div>
            <div class="stat-box warn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Masuk</div>
                <div class="stat-value">${stats.pending_in}</div>
            </div>
            <div class="stat-box warn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Keluar</div>
                <div class="stat-value">${stats.pending_out}</div>
            </div>
            <div class="stat-box danger" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                <div class="stat-label">Pending Barang/Klien Baru</div>
                <div class="stat-value">${stats.pending_new_masters}</div>
            </div>
        `;
        
    } catch (error) {
        statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard.</p></div>`;
        console.error('Staff Dashboard load error:', error);
    } finally {
        hideLoadingModal();
    }
}


/* init_supervisor - Dashboard Supervisor */
function init_supervisor(){
    console.log('Supervisor dashboard loaded.');
    // Tambahkan fungsi loadSupervisorDashboard() jika ada logika spesifik
}

/* init_admin - Dashboard Admin */
function init_admin(){
    loadAdminDashboard();
}

/* Fungsi untuk Admin Dashboard (Dipindahkan dari app.js) */
async function loadAdminDashboard() {
    const dashboardDiv = document.getElementById('adminUserList');
    if (!dashboardDiv) return;
    
    dashboardDiv.innerHTML = '<div class="card"><p>Memuat data user...</p></div>';
    showLoadingModal('Mengambil data user...');
    
    try {
        const response = await fetch('api/admin_users.php');
        const data = await response.json();
        
        if (!data.success) {
            dashboardDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        // Hitung statistik
        const totalUsers = data.data.length;
        const activeUsers = data.data.filter(u => u.is_active == 1).length;
        const inactiveUsers = data.data.filter(u => u.is_active == 0).length;
        
        // Hitung per role
        const roleCount = {
            admin: data.data.filter(u => u.role === 'admin').length,
            staff: data.data.filter(u => u.role === 'staff').length,
            supervisor: data.data.filter(u => u.role === 'supervisor').length,
            owner: data.data.filter(u => u.role === 'owner').length
        };

        let html = `
            <div class="card">
                <h2>👨‍💼 Admin Dashboard</h2>
                <p class="small">Selamat datang, Administrator! Berikut adalah ringkasan pengguna sistem SWIMS.</p>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
                <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-label">Total User</div>
                    <div class="stat-value">${totalUsers}</div>
                </div>
                <div class="stat-box success">
                    <div class="stat-label">User Aktif</div>
                    <div class="stat-value">${activeUsers}</div>
                </div>
                <div class="stat-box danger">
                    <div class="stat-label">User Non-aktif</div>
                    <div class="stat-value">${inactiveUsers}</div>
                </div>
            </div>
            
            <div class="card">
                <h3>Statistik Berdasarkan Role</h3>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px;">
                    <div class="stat-box" style="background:#3b82f6;">
                        <div class="stat-label">Admin</div>
                        <div class="stat-value">${roleCount.admin}</div>
                    </div>
                    <div class="stat-box" style="background:#8b5cf6;">
                        <div class="stat-label">Staff</div>
                        <div class="stat-value">${roleCount.staff}</div>
                    </div>
                    <div class="stat-box" style="background:#ec4899;">
                        <div class="stat-label">Supervisor</div>
                        <div class="stat-value">${roleCount.supervisor}</div>
                    </div>
                    <div class="stat-box" style="background:#f59e0b;">
                        <div class="stat-label">Owner</div>
                        <div class="stat-value">${roleCount.owner}</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">Daftar User Terdaftar</h3>
                    <button class="btn primary" onclick="loadPage('admin_users')">Kelola User</button>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Terdaftar</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Render tabel user
        data.data.forEach(user => {
            const statusBadge = user.is_active == 1 
                ? '<span class="badge badge-success">Aktif</span>' 
                : '<span class="badge badge-danger">Non-aktif</span>';
            
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td><span class="role-badge">${user.role}</span></td>
                    <td>${statusBadge}</td>
                    <td>${user.created_at.substring(0, 10)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        dashboardDiv.innerHTML = html;

    } catch (error) {
        dashboardDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p></div>`;
        console.error('Admin dashboard load error:', error);
    } finally {
        hideLoadingModal();
    }
}


/* init_owner - Dashboard Owner */
function init_owner(){
    if(typeof loadOwnerDashboard === 'function') {
        loadOwnerDashboard();
    }
}

// Expose init functions and helpers
window.init_staff = init_staff;
window.loadStaffDashboard = loadStaffDashboard;
window.init_supervisor = init_supervisor;
window.init_admin = init_admin;
window.loadAdminDashboard = loadAdminDashboard;
window.init_owner = init_owner;