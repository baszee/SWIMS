<!-- ============================================================================
FILE: pages/admin_activity_logs.php - IMPROVED DESIGN v2.0
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div>
            <h2 style="margin:0; display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.8rem;">📋</span> Activity Logs
            </h2>
            <p class="small" style="margin:5px 0 0 0;">Complete audit trail untuk semua aktivitas sistem SWIMS</p>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" onclick="exportActivityLogs()">📄 Export CSV</button>
            <button class="btn btn-sm" onclick="cleanOldActivityLogs()">🗑️ Clean Old</button>
            <button class="btn primary btn-sm" onclick="refreshActivityLogs()">🔄 Refresh</button>
        </div>
    </div>
</div>

<!-- Stats Cards -->
<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;" id="activityStatsCards">
    <div class="card" style="text-align:center;">
        <p class="small" style="margin:0; color:var(--muted);">Total Logs</p>
        <p style="font-size:2rem; font-weight:700; margin:5px 0; color:var(--primary);" id="statTotal">-</p>
    </div>
</div>

<!-- Filters -->
<div class="card">
    <h3 style="margin-top:0;">🔍 Filter & Search</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">User</label>
            <select id="filterUser" onchange="applyActivityFilters()" style="margin:0;">
                <option value="">-- Semua User --</option>
            </select>
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Action Type</label>
            <select id="filterAction" onchange="applyActivityFilters()" style="margin:0;">
                <option value="">-- Semua Action --</option>
                <option value="LOGIN">🔐 LOGIN</option>
                <option value="LOGOUT">🚪 LOGOUT</option>
                <option value="CREATE">➕ CREATE</option>
                <option value="UPDATE">✏️ UPDATE</option>
                <option value="DELETE">🗑️ DELETE</option>
                <option value="APPROVE">✅ APPROVE</option>
                <option value="REJECT">❌ REJECT</option>
                <option value="VIEW">👁️ VIEW</option>
                <option value="DEACTIVATE">🔒 DEACTIVATE</option>
            </select>
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Dari Tanggal</label>
            <input type="date" id="filterDateFrom" onchange="applyActivityFilters()" style="margin:0;">
        </div>
        
        <div>
            <label style="margin: 0 0 5px 0; font-weight:600;">Sampai Tanggal</label>
            <input type="date" id="filterDateTo" onchange="applyActivityFilters()" style="margin:0;">
        </div>
    </div>
    
    <div style="margin-top: 12px;">
        <label style="margin: 0 0 5px 0; font-weight:600;">Cari dalam Deskripsi</label>
        <div style="display: flex; gap: 8px;">
            <input type="text" id="searchBox" placeholder="Ketik untuk mencari..." style="flex: 1; margin: 0;" onkeyup="handleSearchKeyup(event)">
            <button class="btn primary" onclick="applyActivityFilters()">🔍 Search</button>
            <button class="btn" onclick="resetActivityFilters()">🔄 Reset</button>
        </div>
    </div>
    
    <div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p class="small" style="margin: 0; color: #1e3a8a;" id="filterStatus">
            Menampilkan: <strong>100 logs terakhir</strong>
        </p>
    </div>
</div>

<!-- Activity Logs Table -->
<div class="card">
    <div id="activityLogsContainer">
        <p style="text-align: center;">⏳ Memuat activity logs...</p>
    </div>
</div>

<!-- Tips -->
<div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
    <h4 style="margin-top:0; color:#1e40af;">💡 Tips Penggunaan</h4>
    <ul class="small" style="margin:0; padding-left:20px; color:#1e3a8a;">
        <li><strong>Filter:</strong> Gunakan filter untuk mempersempit hasil pencarian</li>
        <li><strong>Export:</strong> Download logs dalam format CSV untuk analisis lebih lanjut</li>
        <li><strong>Clean Old:</strong> Hapus logs lama (>90 hari) untuk menghemat space database</li>
        <li><strong>Detail:</strong> Klik tombol 👁️ Detail untuk melihat metadata lengkap</li>
    </ul>
</div>

<script>
console.log('📋 Admin Activity Logs Viewer v2.0');

// ========================================
// GLOBAL STATE
// ========================================
let allActivityLogs = [];
let filteredActivityLogs = [];
let usersActivityList = [];
let currentActivityFilters = {
    user_id: null,
    action: null,
    date_from: null,
    date_to: null,
    search: null
};

// ========================================
// INIT PAGE
// ========================================
async function init_admin_activity_logs() {
    console.log('🚀 Initializing activity logs viewer...');
    
    await Promise.all([
        loadUsersActivityList(),
        loadActivityLogs()
    ]);
    
    console.log('✅ Activity logs viewer initialized');
}

// ========================================
// LOAD USERS LIST (for filter)
// ========================================
async function loadUsersActivityList() {
    try {
        const response = await fetch('api/admin_activity.php?action=users');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        usersActivityList = data.data;
        
        const userFilter = document.getElementById('filterUser');
        userFilter.innerHTML = '<option value="">-- Semua User --</option>';
        
        usersActivityList.forEach(user => {
            userFilter.innerHTML += `
                <option value="${user.id}">${user.username} (${user.role})</option>
            `;
        });
        
        console.log('✅ Users list loaded:', usersActivityList.length);
        
    } catch (error) {
        console.error('Load users list error:', error);
    }
}

// ========================================
// LOAD ACTIVITY LOGS
// ========================================
async function loadActivityLogs() {
    const container = document.getElementById('activityLogsContainer');
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat logs...</p>';
    
    showLoadingModal('Mengambil activity logs...');
    
    try {
        let url = 'api/admin_activity.php?action=';
        
        const hasFilters = Object.values(currentActivityFilters).some(v => v !== null && v !== '');
        
        if (hasFilters) {
            url += 'search';
            if (currentActivityFilters.user_id) url += `&user_id=${currentActivityFilters.user_id}`;
            if (currentActivityFilters.action) url += `&action_type=${currentActivityFilters.action}`;
            if (currentActivityFilters.date_from) url += `&date_from=${currentActivityFilters.date_from}`;
            if (currentActivityFilters.date_to) url += `&date_to=${currentActivityFilters.date_to}`;
            if (currentActivityFilters.search) url += `&search=${encodeURIComponent(currentActivityFilters.search)}`;
        } else {
            url += 'recent&limit=100';
        }
        
        console.log('📡 Fetching logs from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        allActivityLogs = data.data;
        filteredActivityLogs = allActivityLogs;
        
        console.log('✅ Logs loaded:', allActivityLogs.length);
        
        renderActivityLogsTable(filteredActivityLogs);
        updateActivityFilterStatus();
        updateActivityStats();
        
    } catch (error) {
        console.error('Load logs error:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--danger); font-weight:600;">❌ Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadActivityLogs()">🔄 Coba Lagi</button>
            </div>
        `;
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// UPDATE STATS
// ========================================
function updateActivityStats() {
    const total = filteredActivityLogs.length;
    
    document.getElementById('statTotal').textContent = total.toLocaleString();
    
    // Count by action
    const actionCount = {};
    filteredActivityLogs.forEach(log => {
        actionCount[log.action] = (actionCount[log.action] || 0) + 1;
    });
    
    // Display top actions
    const statsContainer = document.getElementById('activityStatsCards');
    const sortedActions = Object.entries(actionCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    
    sortedActions.forEach(([action, count]) => {
        const icon = getActivityActionIcon(action);
        const color = getActivityActionColor(action);
        
        statsContainer.innerHTML += `
            <div class="card" style="text-align:center;">
                <p class="small" style="margin:0; color:${color};">${icon} ${action}</p>
                <p style="font-size:2rem; font-weight:700; margin:5px 0; color:${color};">${count}</p>
            </div>
        `;
    });
}

// ========================================
// RENDER LOGS TABLE
// ========================================
function renderActivityLogsTable(logs) {
    const container = document.getElementById('activityLogsContainer');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="font-size:3rem; margin:0;">📭</p>
                <p style="color:var(--muted); font-weight:600;">Tidak ada log yang sesuai filter</p>
                <button class="btn primary btn-sm" onclick="resetActivityFilters()">Reset Filter</button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x:auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Description</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                        <th>Detail</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    logs.forEach(log => {
        const icon = getActivityActionIcon(log.action);
        const color = getActivityActionColor(log.action);
        const time = new Date(log.created_at).toLocaleString('id-ID');
        
        html += `
            <tr>
                <td>${log.id}</td>
                <td>
                    <strong>${log.username}</strong><br>
                    <span class="role-badge" style="font-size:0.7rem;">${log.user_role}</span>
                </td>
                <td>
                    <span class="badge" style="background:${color}; color:white; font-size:0.8rem;">
                        ${icon} ${log.action}
                    </span>
                </td>
                <td style="max-width:300px; white-space:normal;">${log.description}</td>
                <td><span class="small">${log.ip_address || '-'}</span></td>
                <td><span class="small">${time}</span></td>
                <td>
                    ${log.metadata ? `<button class="btn btn-sm" onclick='showActivityLogDetail(${JSON.stringify(log).replace(/'/g, "&apos;")})'>👁️</button>` : '-'}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// ========================================
// SHOW LOG DETAIL MODAL
// ========================================
function showActivityLogDetail(log) {
    let metadata = 'Tidak ada metadata tambahan';
    
    if (log.metadata) {
        try {
            const meta = JSON.parse(log.metadata);
            metadata = '<pre style="background:#f8fafc; padding:12px; border-radius:6px; overflow:auto; max-height:300px;">' + 
                       JSON.stringify(meta, null, 2) + '</pre>';
        } catch (e) {
            metadata = log.metadata;
        }
    }
    
    const time = new Date(log.created_at).toLocaleString('id-ID');
    const icon = getActivityActionIcon(log.action);
    const color = getActivityActionColor(log.action);
    
    showMessageModal(
        `📋 Log Detail #${log.id}`,
        `
        <div style="text-align:left;">
            <p><strong>User:</strong> ${log.username} (${log.user_role})</p>
            <p><strong>Action:</strong> <span class="badge" style="background:${color}; color:white;">${icon} ${log.action}</span></p>
            <p><strong>Description:</strong><br>${log.description}</p>
            <p><strong>IP Address:</strong> ${log.ip_address || '-'}</p>
            <p><strong>Timestamp:</strong> ${time}</p>
            <hr style="margin:15px 0;">
            <p><strong>Metadata:</strong></p>
            ${metadata}
        </div>
        `,
        false
    );
}

// ========================================
// FILTER FUNCTIONS
// ========================================
function applyActivityFilters() {
    currentActivityFilters = {
        user_id: document.getElementById('filterUser').value || null,
        action: document.getElementById('filterAction').value || null,
        date_from: document.getElementById('filterDateFrom').value || null,
        date_to: document.getElementById('filterDateTo').value || null,
        search: document.getElementById('searchBox').value.trim() || null
    };
    
    console.log('🔍 Applying filters:', currentActivityFilters);
    loadActivityLogs();
}

function resetActivityFilters() {
    document.getElementById('filterUser').value = '';
    document.getElementById('filterAction').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('searchBox').value = '';
    
    currentActivityFilters = {
        user_id: null,
        action: null,
        date_from: null,
        date_to: null,
        search: null
    };
    
    loadActivityLogs();
}

function updateActivityFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    const hasFilters = Object.values(currentActivityFilters).some(v => v !== null);
    
    if (hasFilters) {
        const filters = [];
        if (currentActivityFilters.user_id) {
            const user = usersActivityList.find(u => u.id == currentActivityFilters.user_id);
            filters.push(`User: ${user?.username}`);
        }
        if (currentActivityFilters.action) filters.push(`Action: ${currentActivityFilters.action}`);
        if (currentActivityFilters.date_from) filters.push(`From: ${currentActivityFilters.date_from}`);
        if (currentActivityFilters.date_to) filters.push(`To: ${currentActivityFilters.date_to}`);
        if (currentActivityFilters.search) filters.push(`Search: "${currentActivityFilters.search}"`);
        
        statusEl.innerHTML = `Menampilkan: <strong>${filteredActivityLogs.length} logs</strong> dengan filter: ${filters.join(', ')}`;
    } else {
        statusEl.innerHTML = `Menampilkan: <strong>${filteredActivityLogs.length} logs terakhir</strong>`;
    }
}

function handleSearchKeyup(event) {
    if (event.key === 'Enter') {
        applyActivityFilters();
    }
}

// ========================================
// EXPORT LOGS
// ========================================
function exportActivityLogs() {
    if (filteredActivityLogs.length === 0) {
        showMessageModal('Info', 'Tidak ada data untuk diekspor.', false);
        return;
    }
    
    let csv = 'ID,User,Role,Action,Description,IP Address,Timestamp\n';
    
    filteredActivityLogs.forEach(log => {
        const time = new Date(log.created_at).toLocaleString('id-ID');
        csv += `${log.id},"${log.username}","${log.user_role}","${log.action}","${log.description.replace(/"/g, '""')}","${log.ip_address || '-'}","${time}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showMessageModal('✅ Sukses', 'Activity logs berhasil diekspor!', false);
}

// ========================================
// CLEAN OLD LOGS
// ========================================
function cleanOldActivityLogs() {
    showMessageModal(
        '⚠️ Konfirmasi',
        'Hapus activity logs yang lebih lama dari 90 hari?<br><br><small>Aksi ini tidak dapat dibatalkan.</small>',
        true,
        async () => {
            showLoadingModal('Membersihkan logs...');
            
            try {
                const response = await fetch('api/admin_activity.php?days=90', {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessageModal('✅ Sukses', `${data.data.deleted_count} log entries berhasil dihapus.`, false);
                    loadActivityLogs();
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', 'Gagal membersihkan logs: ' + error.message, false);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// ========================================
// REFRESH LOGS
// ========================================
function refreshActivityLogs() {
    showLoadingModal('Memperbarui logs...');
    loadActivityLogs().then(() => {
        hideLoadingModal();
    });
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getActivityActionIcon(action) {
    const icons = {
        'LOGIN': '🔐',
        'LOGOUT': '🚪',
        'CREATE': '➕',
        'UPDATE': '✏️',
        'DELETE': '🗑️',
        'APPROVE': '✅',
        'REJECT': '❌',
        'VIEW': '👁️',
        'EXPORT': '📄',
        'LOGIN_FAILED': '⚠️',
        'DEACTIVATE': '🔒'
    };
    return icons[action] || '📋';
}

function getActivityActionColor(action) {
    const colors = {
        'LOGIN': '#10b981',
        'LOGOUT': '#6b7280',
        'CREATE': '#3b82f6',
        'UPDATE': '#f59e0b',
        'DELETE': '#ef4444',
        'APPROVE': '#10b981',
        'REJECT': '#ef4444',
        'VIEW': '#8b5cf6',
        'EXPORT': '#06b6d4',
        'LOGIN_FAILED': '#ef4444',
        'DEACTIVATE': '#ef4444'
    };
    return colors[action] || '#6b7280';
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_admin_activity_logs = init_admin_activity_logs;
window.loadActivityLogs = loadActivityLogs;
window.applyActivityFilters = applyActivityFilters;
window.resetActivityFilters = resetActivityFilters;
window.exportActivityLogs = exportActivityLogs;
window.cleanOldActivityLogs = cleanOldActivityLogs;
window.refreshActivityLogs = refreshActivityLogs;
window.showActivityLogDetail = showActivityLogDetail;
window.handleSearchKeyup = handleSearchKeyup;

console.log('✅ Activity Logs Viewer Module v2.0 Loaded (IMPROVED)');
</script>