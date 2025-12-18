/**
 * DASHBOARD.JS - FIXED (No duplicate globals, IIFE, defensive)
 */

(function (global) {
    'use strict';

    // Do not redeclare ROLE_COLORS if it exists. Provide fallback only.
    if (!global.ROLE_COLORS) {
        global.ROLE_COLORS = {
            admin: '#E07A5F',
            owner: '#D9A441',
            supervisor: '#6CA78C',
            staff: '#5E81AC'
        };
    }

    // Helpers
    function hexToRgb(hex) {
        const normalized = (hex || '').replace('#','');
        if (normalized.length !== 6) return null;
        const bigint = parseInt(normalized, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
    }
    function getRoleColor(role) {
        return (global.ROLE_COLORS && global.ROLE_COLORS[role]) ? global.ROLE_COLORS[role] : global.ROLE_COLORS.admin;
    }
    function setRoleCssVars(color) {
        const rgb = hexToRgb(color);
        try { document.documentElement.style.setProperty('--current-role-color', color); } catch (e) {}
        if (rgb) { try { document.documentElement.style.setProperty('--current-role-rgb', rgb); } catch (e) {} }
    }
    function getRoleCssVar(role) { return `var(--role-${role})`; }
    function $id(id) { return document.getElementById(id) || null; }
    function fmtDateShort(value) {
        if (!value) return '-';
        try {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
            }
        } catch (e) {}
        if (typeof value === 'string') return value.substring(0, 16);
        return String(value);
    }
    async function safeFetchJson(url) {
        const res = await fetch(url, { cache: 'no-store' });
        const txt = await res.text();
        try { return JSON.parse(txt); }
        catch (e) { throw new Error(`Invalid JSON from ${url}: ${e.message}`); }
    }

    // STAFF
    function init_staff() {
        try { showLoadingModal && showLoadingModal('Memuat Dashboard Staff...'); } catch (e) {}
        const masterPromise = (typeof loadMasterData === 'function') ? loadMasterData() : Promise.resolve();
        masterPromise.then(loadStaffDashboard).catch(err => {
            console.warn('loadMasterData fail or missing:', err);
            loadStaffDashboard();
        });
    }
    async function loadStaffDashboard() {
        const statsDiv = $id('staffStats'), welcomeEl = $id('staffWelcome');
        const user = (typeof currentUser === 'function') ? currentUser() : null;
        if (!statsDiv) { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} ; return; }
        if (welcomeEl) welcomeEl.innerHTML = `Selamat datang, <b>${(user && user.username) || 'User'}</b>. Pantau status transaksi Anda di sini.`;
        statsDiv.innerHTML = '';
        try {
            const data = await safeFetchJson('api/report.php?action=staff_summary');
            if (!data.success || !data.data) {
                statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message || 'Unknown'}</p></div>`;
                return;
            }
            const stats = data.data;
            const roleColor = getRoleColor((user && user.role) || 'staff');
            statsDiv.innerHTML = `
                <div class="stat-grid">
                    <div class="stat-box" style="background:linear-gradient(135deg, ${roleColor} 0%, rgba(0,0,0,0.18) 100%);">
                        <div class="stat-label">Total Jenis Barang (Approved)</div>
                        <div class="stat-value">${Number(stats.total_items || 0).toLocaleString()}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--warning) 0%, #c58c36 100%);">
                        <div class="stat-label">Pending Masuk</div>
                        <div class="stat-value">${Number(stats.pending_in || 0)}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--warning) 0%, #c58c36 100%);">
                        <div class="stat-label">Pending Keluar</div>
                        <div class="stat-value">${Number(stats.pending_out || 0)}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, ${roleColor} 0%, rgba(0,0,0,0.18) 100%);">
                        <div class="stat-label">Pending Klien/Suplier Baru</div>
                        <div class="stat-value">${Number(stats.pending_new_masters || 0)}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard.</p></div>`;
            console.error('Staff Dashboard load error:', error);
        } finally { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} }
    }

    // SUPERVISOR
    function init_supervisor() {
        try { showLoadingModal && showLoadingModal('Memuat Dashboard Supervisor...'); } catch (e) {}
        loadSupervisorDashboard();
    }
    async function loadSupervisorDashboard() {
        const user = (typeof currentUser === 'function') ? currentUser() : null;
        if (!user) { console.error('User not found - redirecting'); try { hideLoadingModal && hideLoadingModal(); } catch (e) {} ; typeof loadPage === 'function' && loadPage('login'); return; }
        const nameEl = $id('supervisorName'); if (nameEl) nameEl.textContent = user.username || '';
        await Promise.allSettled([ loadSupervisorStats(), loadRecentTransactions(), loadRecentItems() ]);
        try { hideLoadingModal && hideLoadingModal(); } catch (e) {}
        console.log('Supervisor dashboard ready');
    }
    async function loadSupervisorStats() {
        const statsDiv = $id('supervisorStats'); if (!statsDiv) return;
        statsDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat statistik...</p></div>';
        try {
            const transData = await safeFetchJson('api/approval.php?action=transactions');
            const suppliersData = await safeFetchJson('api/approval.php?action=suppliers');
            let pendingIn = 0, pendingOut = 0, pendingSuppliers = 0;
            if (transData.success && Array.isArray(transData.data)) {
                pendingIn = transData.data.filter(t => t.type === 'IN').length;
                pendingOut = transData.data.filter(t => t.type === 'OUT').length;
            }
            if (suppliersData.success && Array.isArray(suppliersData.data)) pendingSuppliers = suppliersData.data.length;
            const totalPending = pendingIn + pendingOut;
            const roleColor = getRoleColor((typeof currentUser === 'function' && currentUser() && currentUser().role) || 'supervisor');
            statsDiv.innerHTML = `
                <div class="stat-grid">
                    <div class="stat-box" style="background:linear-gradient(135deg, ${roleColor} 0%, rgba(0,0,0,0.18) 100%);">
                        <div class="stat-label">Total Pending Transaksi</div>
                        <div class="stat-value">${totalPending}</div>
                        <p class="small" style="margin-top:8px;">${pendingIn} Masuk + ${pendingOut} Keluar</p>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--warning) 0%, #c58c36 100%);">
                        <div class="stat-label">Barang Masuk Pending</div>
                        <div class="stat-value">${pendingIn}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--warning) 0%, #c58c36 100%);">
                        <div class="stat-label">Barang Keluar Pending</div>
                        <div class="stat-value">${pendingOut}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, ${roleColor} 0%, rgba(0,0,0,0.18) 100%);">
                        <div class="stat-label">Supplier Baru Pending</div>
                        <div class="stat-value">${pendingSuppliers}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Supervisor stats error:', error);
            statsDiv.innerHTML = `<div class="card" style="background:#F8E2E0;"><h4 style="color:#B94F4F;">Error Memuat Statistik</h4><p style="color:#B94F4F;">${error.message}</p></div>`;
        }
    }
    async function loadRecentTransactions() {
        const container = $id('recentTransactions'); if (!container) return; container.innerHTML = '<p style="text-align:center;">⏳ Memuat...</p>';
        try {
            const data = await safeFetchJson('api/approval.php?action=transactions');
            if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">Tidak ada transaksi pending</p>`;
                return;
            }
            const recent = data.data.slice(0,5);
            let html = '<table class="table"><thead><tr><th>Kode</th><th>Type</th><th>Item</th><th>Qty</th><th>Requester</th><th>Tanggal</th></tr></thead><tbody>';
            recent.forEach(t => {
                const typeBadge = t.type === 'IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
                html += `<tr><td><strong>${t.transaction_code || '-'}</strong></td><td>${typeBadge}</td><td>${t.item_name || '-'}<br><span class="small">(${t.sku || '-'})</span></td><td><strong>${t.quantity || 0}</strong></td><td>${t.requester_name || '-'}</td><td class="small">${fmtDateShort(t.request_date)}</td></tr>`;
            });
            html += '</tbody></table>';
            if (data.data.length > 5) html += `<p class="small" style="margin-top:10px; text-align:center; color:var(--muted);">Dan ${data.data.length - 5} transaksi lainnya...</p>`;
            container.innerHTML = html;
        } catch (error) { console.error('Load recent transactions error:', error); container.innerHTML = `<p style="color:var(--danger);">Error: ${error.message}</p>`; }
    }
    async function loadRecentItems() {
        const container = $id('recentItems'); if (!container) return; container.innerHTML = '<p style="text-align:center;">⏳ Memuat...</p>';
        try {
            const data = await safeFetchJson('api/approval.php?action=suppliers');
            if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">Tidak ada request pending</p>`;
                return;
            }
            const recent = data.data.slice(0,5);
            let html = '<table class="table"><thead><tr><th>Nama</th><th>Kontak</th><th>Telepon</th><th>Requester</th><th>Tanggal</th></tr></thead><tbody>';
            recent.forEach(s => {
                html += `<tr><td><strong>${s.name || '-'}</strong></td><td>${s.contact_person || '-'}</td><td>${s.phone || '-'}</td><td>${s.requester_name || '-'}</td><td class="small">${fmtDateShort(s.created_at)}</td></tr>`;
            });
            html += '</tbody></table>';
            if (data.data.length > 5) html += `<p class="small" style="margin-top:10px; text-align:center; color:var(--muted);">Dan ${data.data.length - 5} request lainnya...</p>`;
            container.innerHTML = html;
        } catch (error) { console.error('Load recent items error:', error); container.innerHTML = `<p style="color:var(--danger);">Error: ${error.message}</p>`; }
    }

    // OWNER
    function init_owner() { try { showLoadingModal && showLoadingModal('Mengambil data ringkasan Owner...'); } catch (e) {} ; loadOwnerDashboard(); }
    async function loadOwnerDashboard() {
        const statsDiv = $id('ownerStats'), warningDiv = $id('lowStockWarning');
        if (!statsDiv || !warningDiv) { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} ; return; }
        statsDiv.innerHTML = '<div class="card"><p>Memuat statistik...</p></div>'; warningDiv.innerHTML = '';
        try {
            const user = (typeof currentUser === 'function') ? currentUser() : null;
            if (!user) { statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">User tidak ditemukan.</p></div>`; return; }
            const data = await safeFetchJson('api/report.php?action=summary');
            if (!data.success || !data.data) { statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message || 'Unknown'}</p></div>`; return; }
            const stats = data.data; const roleColor = getRoleColor(user.role || 'owner');
            setRoleCssVars(roleColor);
            statsDiv.innerHTML = `
                <div class="stat-grid">
                    <div class="stat-box" style="background:linear-gradient(135deg, ${roleColor} 0%, rgba(0,0,0,0.18) 100%);">
                        <div class="stat-label">Total Jenis Barang</div>
                        <div class="stat-value">${Number(stats.total_items || 0).toLocaleString()}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--success) 0%, #2F8B5E 100%);">
                        <div class="stat-label">Total Stok Semua Item</div>
                        <div class="stat-value">${Number(stats.total_stock || 0).toLocaleString()} Pcs</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--warning) 0%, #c58c36 100%);">
                        <div class="stat-label">Pending Transaksi</div>
                        <div class="stat-value">${Number((stats.transactions && stats.transactions.pending) || 0)}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--success) 0%, #2F8B5E 100%);">
                        <div class="stat-label">Approved Transaksi</div>
                        <div class="stat-value">${Number((stats.transactions && stats.transactions.approved) || 0)}</div>
                    </div>
                    <div class="stat-box" style="background:linear-gradient(135deg, var(--danger) 0%, #b34f4f 100%);">
                        <div class="stat-label">Item Baru PENDING Approval</div>
                        <div class="stat-value">${Number(stats.pending_items || 0)}</div>
                    </div>
                </div>
            `;
            if (Number(stats.low_stock || 0) > 0) {
                warningDiv.innerHTML = `<div class="card" style="margin-top:16px; background:#F6E9CC; border-color:#E2AD4C;"><h4 style="margin-top:0; color:var(--warning);">PERINGATAN STOK RENDAH</h4><p style="color:#94641C; margin:0;">Terdapat <strong>${Number(stats.low_stock)}</strong> jenis item yang sudah mencapai atau di bawah Stok Minimum. Mohon periksa Laporan Inventaris.</p></div>`;
            }
        } catch (error) { statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard Owner.</p></div>`; console.error('Owner Dashboard load error:', error); }
        finally { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} }
    }

    // ADMIN
    function init_admin() { try { showLoadingModal && showLoadingModal('Memuat Dashboard Admin...'); } catch (e) {} ; loadAdminDashboardSimple(); }
    async function loadAdminDashboardSimple() {
        const dashboardDiv = $id('adminDashboard'); if (!dashboardDiv) { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} ; return; }
        dashboardDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat dashboard...</p></div>';
        try {
            const data = await safeFetchJson('api/admin_user.php');
            if (!data.success || !Array.isArray(data.data)) { dashboardDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message || 'Unknown'}</p></div>`; return; }
            const users = data.data;
            const totalUsers = users.length;
            const activeUsers = users.filter(u => Number(u.is_active) === 1).length;
            const inactiveUsers = users.filter(u => Number(u.is_active) === 0).length;
            const roleCount = { admin: users.filter(u => u.role === 'admin').length, staff: users.filter(u => u.role === 'staff').length, supervisor: users.filter(u => u.role === 'supervisor').length, owner: users.filter(u => u.role === 'owner').length };
            const recentUsers = users.slice(0,5);
            const currUser = (typeof currentUser === 'function') ? currentUser() : null;
            const adminColor = getRoleColor((currUser && currUser.role) ? currUser.role : 'admin');
            setRoleCssVars(adminColor);
            let html = `<div class="card"><h2>Admin Dashboard</h2><p class="small">Selamat datang, <b>${(currUser && currUser.username) || 'Admin'}</b>! Berikut adalah ringkasan pengguna sistem SWIMS.</p></div>`;
            html += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">`;
            html += `<div class="stat-box" style="background:linear-gradient(135deg, ${adminColor} 0%, rgba(0,0,0,0.18) 100%);"><div class="stat-label">Total User</div><div class="stat-value">${totalUsers}</div><p class="small" style="margin-top:8px;">Terdaftar di sistem</p></div>`;
            html += `<div class="stat-box" style="background:linear-gradient(135deg, var(--success) 0%, #2F8B5E 100%);"><div class="stat-label">User Aktif</div><div class="stat-value">${activeUsers}</div></div>`;
            html += `<div class="stat-box" style="background:linear-gradient(135deg, var(--danger) 0%, #b34f4f 100%);"><div class="stat-label">User Non-aktif</div><div class="stat-value">${inactiveUsers}</div></div>`;
            html += `</div><div class="card"><h3>Statistik Berdasarkan Role</h3><div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:16px;">`;
            html += `<div class="stat-box" style="background: linear-gradient(135deg, ${getRoleCssVar('admin')} 0%, rgba(0,0,0,0.05) 100%);"><div class="stat-label">Admin</div><div class="stat-value">${roleCount.admin}</div></div>`;
            html += `<div class="stat-box" style="background: linear-gradient(135deg, ${getRoleCssVar('staff')} 0%, rgba(0,0,0,0.05) 100%);"><div class="stat-label">Staff</div><div class="stat-value">${roleCount.staff}</div></div>`;
            html += `<div class="stat-box" style="background: linear-gradient(135deg, ${getRoleCssVar('supervisor')} 0%, rgba(0,0,0,0.05) 100%);"><div class="stat-label">Supervisor</div><div class="stat-value">${roleCount.supervisor}</div></div>`;
            html += `<div class="stat-box" style="background: linear-gradient(135deg, ${getRoleCssVar('owner')} 0%, rgba(0,0,0,0.05) 100%);"><div class="stat-label">Owner</div><div class="stat-value">${roleCount.owner}</div></div>`;
            html += `</div></div><div class="card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 style="margin:0;">User Terbaru (5 Terakhir)</h3><button class="btn primary" onclick="loadPage && loadPage('admin_users')">Lihat Semua User</button></div><table class="table"><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>Terdaftar</th></tr></thead><tbody>`;
            recentUsers.forEach(u => {
                const statusBadge = Number(u.is_active) === 1 ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Non-aktif</span>';
                html += `<tr><td>${u.id || '-'}</td><td><b>${u.username || '-'}</b></td><td><span class="role-badge">${u.role || '-'}</span></td><td>${statusBadge}</td><td>${fmtDateShort(u.created_at)}</td></tr>`;
            });
            dashboardDiv.innerHTML = html;
        } catch (error) {
            dashboardDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p><button class="btn primary" onclick="loadAdminDashboardSimple()">Coba Lagi</button></div>`;
            console.error('Admin dashboard load error:', error);
        } finally { try { hideLoadingModal && hideLoadingModal(); } catch (e) {} }
    }

    // expose
    global.init_staff = init_staff;
    global.loadStaffDashboard = loadStaffDashboard;
    global.init_supervisor = init_supervisor;
    global.loadSupervisorDashboard = loadSupervisorDashboard;
    global.loadSupervisorStats = loadSupervisorStats;
    global.loadRecentTransactions = loadRecentTransactions;
    global.loadRecentItems = loadRecentItems;
    global.init_owner = init_owner;
    global.loadOwnerDashboard = loadOwnerDashboard;
    global.init_admin = init_admin;
    global.loadAdminDashboardSimple = loadAdminDashboardSimple;

    console.log('✅ Dashboard Module loaded (no duplicate globals)');
})(window);
