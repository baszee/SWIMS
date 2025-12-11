/**
 * =========================================================
 * DASHBOARD.JS - COMPLETE FIXED VERSION
 * Menangani logika pemuatan data dan rendering dashboard
 * untuk semua peran (Staff, Supervisor, Admin, Owner).
 * =========================================================
 */

/* init_staff - Dashboard Staff */
function init_staff(){
    console.log('📊 Init Staff Dashboard');
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

// ========================================
// SUPERVISOR DASHBOARD MODULE
// ========================================

/* init_supervisor - Dashboard Supervisor */
function init_supervisor(){
    console.log('📊 Init Supervisor Dashboard (unified)');
    loadSupervisorDashboard();
}

async function loadSupervisorDashboard() {
    console.log('📍 Step 1: Check current user...');
    
    const user = currentUser();
    if (!user) {
        console.error('❌ User not found! Redirecting to login...');
        loadPage('login');
        return;
    }
    
    // Set nama supervisor
    const nameEl = document.getElementById('supervisorName');
    if (nameEl) {
        nameEl.textContent = user.username;
        console.log('✅ Supervisor name displayed');
    }
    
    console.log('📍 Step 2: Load all dashboard data in parallel...');
    
    // Load all sections in parallel
    await Promise.all([
        loadSupervisorStats(),
        loadRecentTransactions(),
        loadRecentItems()
    ]);
    
    console.log('✅ Dashboard initialization complete!');
}

async function loadSupervisorStats() {
    const statsDiv = document.getElementById('supervisorStats');
    if (!statsDiv) {
        console.error('❌ CRITICAL: supervisorStats div not found!');
        return;
    }
    
    statsDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat statistik...</p></div>';
    showLoadingModal('Memuat statistik Supervisor...');
    
    let stats = { pendingIn: 0, pendingOut: 0, pendingSuppliers: 0 };
    
    try {
        // Fetch 1: Transactions
        const transRes = await fetch('api/approval.php?action=transactions');
        const transData = await transRes.json();
        if (transData.success && Array.isArray(transData.data)) {
            stats.pendingIn = transData.data.filter(t => t.type === 'IN').length;
            stats.pendingOut = transData.data.filter(t => t.type === 'OUT').length;
        }
        
        // Fetch 2: Suppliers
        const suppliersRes = await fetch('api/approval.php?action=suppliers');
        const suppliersData = await suppliersRes.json();
        if (suppliersData.success && Array.isArray(suppliersData.data)) {
            stats.pendingSuppliers = suppliersData.data.length;
        }
        
        const totalPending = stats.pendingIn + stats.pendingOut;
        
        // Render statistics cards
        statsDiv.innerHTML = `
            <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Total Pending Transaksi</div>
                <div class="stat-value">${totalPending}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">${stats.pendingIn} Masuk + ${stats.pendingOut} Keluar</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <div class="stat-label">Barang Masuk Pending</div>
                <div class="stat-value">${stats.pendingIn}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Transaksi IN menunggu</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
                <div class="stat-label">Barang Keluar Pending</div>
                <div class="stat-value">${stats.pendingOut}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Transaksi OUT menunggu</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <div class="stat-label">Supplier Baru Pending</div>
                <div class="stat-value">${stats.pendingSuppliers}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Supplier menunggu approval</p>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Statistics error:', error);
        statsDiv.innerHTML = `<div class="card" style="grid-column: 1 / -1; background:#fee2e2; border-color:#ef4444;"><h4 style="margin-top:0; color:#991b1b;">❌ Error Memuat Statistik</h4><p style="color:#991b1b; margin:5px 0;">${error.message}</p><button class="btn primary btn-sm" onclick="loadSupervisorStats()">🔄 Coba Lagi</button></div>`;
    } finally {
        hideLoadingModal();
    }
}

async function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat...</p>';
    
    try {
        const response = await fetch('api/approval.php?action=transactions');
        const data = await response.json();
        
        if (!data.success || data.data.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">✅ Tidak ada transaksi pending</p>`;
            return;
        }
        
        const recent = data.data.slice(0, 5);
        let html = '<table class="table"><thead><tr>';
        html += '<th>Kode</th><th>Type</th><th>Item</th><th>Qty</th><th>Requester</th><th>Tanggal</th></tr></thead><tbody>';
        
        recent.forEach(t => {
            const typeBadge = t.type === 'IN' ? '<span class="badge badge-in">📦 MASUK</span>' : '<span class="badge badge-out">📤 KELUAR</span>';
            html += `
                <tr>
                    <td><strong>${t.transaction_code}</strong></td>
                    <td>${typeBadge}</td>
                    <td>${t.item_name}<br><span class="small">(${t.sku})</span></td>
                    <td><strong>${t.quantity}</strong></td>
                    <td>${t.requester_name}</td>
                    <td class="small">${t.request_date.substring(0, 16)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        if (data.data.length > 5) {
            html += `<p class="small" style="margin-top:10px; text-align:center; color:var(--muted);">Dan ${data.data.length - 5} transaksi lainnya...</p>`;
        }
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Load recent transactions error:', error);
        container.innerHTML = `<p style="color:var(--danger);">Error: ${error.message}</p>`;
    }
}

async function loadRecentItems() {
    const container = document.getElementById('recentItems');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat...</p>';
    
    try {
        const response = await fetch('api/approval.php?action=suppliers');
        const data = await response.json();
        
        if (!data.success || data.data.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">✅ Tidak ada request pending</p>`;
            return;
        }
        
        const recent = data.data.slice(0, 5);
        let html = '<table class="table"><thead><tr>';
        html += '<th>Nama</th><th>Kontak</th><th>Telepon</th><th>Requester</th><th>Tanggal</th></tr></thead><tbody>';
        
        recent.forEach(s => {
            html += `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.contact_person || '-'}</td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.requester_name}</td>
                    <td class="small">${s.created_at.substring(0, 16)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        if (data.data.length > 5) {
            html += `<p class="small" style="margin-top:10px; text-align:center; color:var(--muted);">Dan ${data.data.length - 5} request lainnya...</p>`;
        }
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Load recent items error:', error);
        container.innerHTML = `<p style="color:var(--danger);">Error: ${error.message}</p>`;
    }
}

// ========================================
// OWNER DASHBOARD MODULE
// ========================================
/* init_owner - Dashboard Owner */
function init_owner(){
    console.log('📊 Init Owner Dashboard (unified)');
    loadOwnerDashboard();
}

async function loadOwnerDashboard() {
    const statsDiv = document.getElementById('ownerStats');
    const warningDiv = document.getElementById('lowStockWarning');
    
    if (!statsDiv || !warningDiv) return;
    
    statsDiv.innerHTML = '<div class="card"><p>Memuat statistik...</p></div>';
    warningDiv.innerHTML = '';
    showLoadingModal('Mengambil data ringkasan Owner...');

    try {
        const user = currentUser();
        if (!user) return;
        
        // Fetch data from api/report.php?action=summary
        const response = await fetch('api/report.php?action=summary');
        const data = await response.json();
        
        if (!data.success) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        const stats = data.data;

        // 1. Rendering Statistik
        statsDiv.innerHTML = `
            <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="stat-label">Total Jenis Barang</div>
                <div class="stat-value">${stats.total_items.toLocaleString()}</div>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <div class="stat-label">Total Stok Semua Item</div>
                <div class="stat-value">${stats.total_stock.toLocaleString()} Pcs</div>
            </div>
            <div class="stat-box warn">
                <div class="stat-label">Pending Transaksi</div>
                <div class="stat-value">${stats.transactions.pending}</div>
            </div>
            <div class="stat-box success">
                <div class="stat-label">Approved Transaksi</div>
                <div class="stat-value">${stats.transactions.approved}</div>
            </div>
            <div class="stat-box danger">
                <div class="stat-label">Item Baru PENDING Approval</div>
                <div class="stat-value">${stats.pending_items}</div>
            </div>
        `;
        
        // 2. Rendering Peringatan Stok Rendah
        if (stats.low_stock > 0) {
            warningDiv.innerHTML = `
                <div class="card" style="margin-top:16px; background:#fef3c7; border-color:#f59e0b;">
                    <h4 style="margin-top:0; color:var(--warning);">🚨 PERINGATAN STOK RENDAH</h4>
                    <p style="color:#92400e; margin:0;">Terdapat **${stats.low_stock}** jenis item yang sudah mencapai atau di bawah Stok Minimum. Mohon periksa Laporan Inventaris.</p>
                </div>
            `;
        }

    } catch (error) {
        statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard Owner.</p></div>`;
        console.error('Owner Dashboard load error:', error);
    } finally {
        hideLoadingModal();
    }
}


// ========================================
// ADMIN DASHBOARD MODULE
// ========================================
/* init_admin - Dashboard Admin - SIMPLE VERSION */
function init_admin(){
    console.log('📊 Init Admin Dashboard v2.0 - CLEAN');
    loadAdminDashboardSimple();
}

async function loadAdminDashboardSimple() {
    console.log('Loading admin dashboard...');
    const dashboardDiv = document.getElementById('adminDashboard');
    
    if (!dashboardDiv) {
        console.error('❌ Element adminDashboard tidak ditemukan!');
        return;
    }
    
    dashboardDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat dashboard...</p></div>';
    showLoadingModal('Mengambil data admin...');
    
    try {
        // Fetch user data
        const response = await fetch('api/admin_user.php');
        const data = await response.json();
        
        if (!data.success) {
            dashboardDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        // Calculate statistics
        const totalUsers = data.data.length;
        const activeUsers = data.data.filter(u => u.is_active == 1).length;
        const inactiveUsers = data.data.filter(u => u.is_active == 0).length;
        
        // Count by role
        const roleCount = {
            admin: data.data.filter(u => u.role === 'admin').length,
            staff: data.data.filter(u => u.role === 'staff').length,
            supervisor: data.data.filter(u => u.role === 'supervisor').length,
            owner: data.data.filter(u => u.role === 'owner').length
        };

        // Get recent users (5 latest)
        const recentUsers = data.data.slice(0, 5);

        let html = `
            <div class="card">
                <h2>👨‍💼 Admin Dashboard</h2>
                <p class="small">Selamat datang, <b>${currentUser().username}</b>! Berikut adalah ringkasan pengguna sistem SWIMS.</p>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
                <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-label">Total User</div>
                    <div class="stat-value">${totalUsers}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Terdaftar di sistem</p>
                </div>
                <div class="stat-box success">
                    <div class="stat-label">User Aktif</div>
                    <div class="stat-value">${activeUsers}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Dapat login</p>
                </div>
                <div class="stat-box danger">
                    <div class="stat-label">User Non-aktif</div>
                    <div class="stat-value">${inactiveUsers}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Tidak dapat login</p>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Statistik Berdasarkan Role</h3>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:16px;">
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
                    <h3 style="margin: 0;">👥 User Terbaru (5 Terakhir)</h3>
                    <button class="btn primary" onclick="loadPage('admin_users')">Lihat Semua User</button>
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
        
        // Render recent users
        recentUsers.forEach(user => {
            const statusBadge = user.is_active == 1 
                ? '<span class="badge badge-success">Aktif</span>' 
                : '<span class="badge badge-danger">Non-aktif</span>';
            
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td><b>${user.username}</b></td>
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

            <div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
                <h3 style="margin-top:0; color:#1e40af;">💡 Tips Administrator</h3>
                <ul style="margin:0; padding-left:20px; color:#1e3a8a;">
                    <li><strong>User Management:</strong> Kelola akun pengguna sistem SWIMS</li>
                    <li><strong>View Stock:</strong> Monitor stok gudang (read-only)</li>
                    <li><strong>Security:</strong> Admin tidak dapat mengubah stok secara langsung</li>
                    <li><strong>Best Practice:</strong> Gunakan password yang kuat dan ganti secara berkala</li>
                </ul>
            </div>
        `;
        
        dashboardDiv.innerHTML = html;

    } catch (error) {
        dashboardDiv.innerHTML = `
            <div class="card">
                <p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p>
                <button class="btn primary" onclick="loadAdminDashboardSimple()">🔄 Coba Lagi</button>
            </div>
        `;
        console.error('Admin dashboard load error:', error);
    } finally {
        hideLoadingModal();
    }
}


// Expose init functions and helpers
window.init_staff = init_staff;
window.loadStaffDashboard = loadStaffDashboard;
window.init_supervisor = init_supervisor;
window.loadSupervisorDashboard = loadSupervisorDashboard; 
window.loadSupervisorStats = loadSupervisorStats; 
window.loadRecentTransactions = loadRecentTransactions; 
window.loadRecentItems = loadRecentItems; 
window.init_owner = init_owner; 
window.loadOwnerDashboard = loadOwnerDashboard; 
window.init_admin = init_admin;
window.loadAdminDashboardSimple = loadAdminDashboardSimple;

console.log('✅ Dashboard Module loaded (Unified)');