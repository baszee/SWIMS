<!-- ============================================================================
FILE: pages/admin_activity_logs.php - Complete Activity Log Viewer
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📋 Activity Logs - Audit Trail</h2>
        <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" onclick="exportLogs()">📄 Export</button>
            <button class="btn btn-sm" onclick="cleanOldLogs()">🗑️ Clean Old Logs</button>
            <button class="btn primary btn-sm" onclick="refreshLogs()">🔄 Refresh</button>
        </div>
    </div>
    <p class="small">Semua aktivitas sistem tercatat di sini untuk keperluan audit dan troubleshooting.</p>
</div>

<!-- Filters -->
<div class="card">
    <h3>🔍 Filter & Search</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <!-- User Filter -->
        <div>
            <label style="margin: 0 0 5px 0;">User</label>
            <select id="filterUser" onchange="applyFilters()">
                <option value="">-- Semua User --</option>
            </select>
        </div>
        
        <!-- Action Type Filter -->
        <div>
            <label style="margin: 0 0 5px 0;">Action Type</label>
            <select id="filterAction" onchange="applyFilters()">
                <option value="">-- Semua Action --</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="APPROVE">APPROVE</option>
                <option value="REJECT">REJECT</option>
                <option value="VIEW">VIEW</option>
                <option value="EXPORT">EXPORT</option>
                <option value="LOGIN_FAILED">LOGIN FAILED</option>
            </select>
        </div>
        
        <!-- Date From -->
        <div>
            <label style="margin: 0 0 5px 0;">Dari Tanggal</label>
            <input type="date" id="filterDateFrom" onchange="applyFilters()">
        </div>
        
        <!-- Date To -->
        <div>
            <label style="margin: 0 0 5px 0;">Sampai Tanggal</label>
            <input type="date" id="filterDateTo" onchange="applyFilters()">
        </div>
    </div>
    
    <!-- Search Box -->
    <div style="margin-top: 12px;">
        <label style="margin: 0 0 5px 0;">Cari dalam Deskripsi</label>
        <div style="display: flex; gap: 8px;">
            <input type="text" id="searchBox" placeholder="Ketik untuk mencari..." style="flex: 1; margin: 0;">
            <button class="btn primary" onclick="applyFilters()">🔍 Search</button>
            <button class="btn" onclick="resetFilters()">🔄 Reset</button>
        </div>
    </div>
    
    <!-- Filter Status -->
    <div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px;">
        <p class="small" style="margin: 0; color: #1e3a8a;" id="filterStatus">
            Menampilkan: <strong>Semua aktivitas (100 terakhir)</strong>
        </p>
    </div>
</div>

<!-- Activity Logs Table -->
<div class="card">
    <div id="activityLogsContainer">
        <p style="text-align: center;">⏳ Memuat activity logs...</p>
    </div>
</div>

<!-- Statistics Panel -->
<div class="card" style="background: #f0f9ff; border-left: 4px solid #3b82f6;">
    <h3 style="margin-top: 0; color: #1e40af;">📊 Statistik Logs</h3>
    <div id="logStatsContainer">
        <p class="small" style="color: #1e3a8a;">Memuat statistik...</p>
    </div>
</div>

<script>
console.log('📋 Admin Activity Logs Viewer v1.0');

// ========================================
// GLOBAL STATE
// ========================================
let allLogs = [];
let filteredLogs = [];
let usersList = [];
let currentFilters = {
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
        loadUsersList(),
        loadLogs()
    ]);
    
    console.log('✅ Activity logs viewer initialized');
}

// ========================================
// LOAD USERS LIST (for filter)
// ========================================
async function loadUsersList() {
    try {
        const response = await fetch('api/admin_activity.php?action=users');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        usersList = data.data;
        
        // Populate user filter dropdown
        const userFilter = document.getElementById('filterUser');
        userFilter.innerHTML = '<option value="">-- Semua User --</option>';
        
        usersList.forEach(user => {
            userFilter.innerHTML += `
                <option value="${user.id}">${user.username} (${user.role})</option>
            `;
        });
        
        console.log('✅ Users list loaded:', usersList.length);
        
    } catch (error) {
        console.error('Load users list error:', error);
    }
}

// ========================================
// LOAD ACTIVITY LOGS
// ========================================
async function loadLogs() {
    const container = document.getElementById('activityLogsContainer');
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat logs...</p>';
    
    try {
        // Build query params
        let url = 'api/admin_activity.php?action=';
        
        // Check if filters are applied
        const hasFilters = Object.values(currentFilters).some(v => v !== null && v !== '');
        
        if (hasFilters) {
            url += 'search';
            if (currentFilters.user_id) url += `&user_id=${currentFilters.user_id}`;
            if (currentFilters.action) url += `&action_type=${currentFilters.action}`;
            if (currentFilters.date_from) url += `&date_from=${currentFilters.date_from}`;
            if (currentFilters.date_to) url += `&date_to=${currentFilters.date_to}`;
            if (currentFilters.search) url += `&search=${encodeURIComponent(currentFilters.search)}`;
        } else {
            url += 'recent&limit=100';
        }
        
        console.log('📡 Fetching logs from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        allLogs = data.data;
        filteredLogs = allLogs;
        
        console.log('✅ Logs loaded:', allLogs.length);
        
        renderLogsTable(filteredLogs);
        updateFilterStatus();
        
    } catch (error) {
        console.error('Load logs error:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="color:var(--danger); font-weight:600;">❌ Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadLogs()">🔄 Coba Lagi</button>
            </div>
        `;
    }
}

// ========================================
// RENDER LOGS TABLE
// ========================================
function renderLogsTable(logs) {
    const container = document.getElementById('activityLogsContainer');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="font-size:3rem; margin:0;">📭</p>
                <p style="color:var(--muted); font-weight:600;">Tidak ada log yang sesuai filter</p>
                <button class="btn primary btn-sm" onclick="resetFilters()">Reset Filter</button>
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
        const icon = getActionIcon(log.action);
        const color = getActionColor(log.action);
        const time = new Date(log.created_at).toLocaleString('id-ID');
        
        html += `
            <tr>
                <td>${log.id}</td>
                <td>
                    <strong>${log.username}</strong><br>
                    <span class="role-badge" style="font-size:0.75rem;">${log.user_role}</span>
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
                    ${log.metadata ? `<button class="btn btn-sm" onclick='showLogDetail(${JSON.stringify(log).replace(/'/g, "&apos;")})'>👁️ Detail</button>` : '-'}
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
function showLogDetail(log) {
    let metadata = 'Tidak ada metadata tambahan';
    
    if (log.metadata) {
        try {
            const meta = JSON.parse(log.metadata);
            metadata = '<pre style="background:#f8fafc; padding:12px; border-radius:6px; overflow:auto;">' + 
                       JSON.stringify(meta, null, 2) + '</pre>';
        } catch (e) {
            metadata = log.metadata;
        }
    }
    
    const time = new Date(log.created_at).toLocaleString('id-ID');
    
    showMessageModal(
        `📋 Log Detail #${log.id}`,
        `
        <div style="text-align:left;">
            <p><strong>User:</strong> ${log.username} (${log.user_role})</p>
            <p><strong>Action:</strong> <span class="badge" style="background:${getActionColor(log.action)}; color:white;">${log.action}</span></p>
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
function applyFilters() {
    currentFilters = {
        user_id: document.getElementById('filterUser').value || null,
        action: document.getElementById('filterAction').value || null,
        date_from: document.getElementById('filterDateFrom').value || null,
        date_to: document.getElementById('filterDateTo').value || null,
        search: document.getElementById('searchBox').value.trim() || null
    };
    
    console.log('🔍 Applying filters:', currentFilters);
    loadLogs();
}

function resetFilters() {
    document.getElementById('filterUser').value = '';
    document.getElementById('filterAction').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('searchBox').value = '';
    
    currentFilters = {
        user_id: null,
        action: null,
        date_from: null,
        date_to: null,
        search: null
    };
    
    loadLogs();
}

function updateFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    const hasFilters = Object.values(currentFilters).some(v => v !== null);
    
    if (hasFilters) {
        const filters = [];
        if (currentFilters.user_id) {
            const user = usersList.find(u => u.id == currentFilters.user_id);
            filters.push(`User: ${user?.username}`);
        }
        if (currentFilters.action) filters.push(`Action: ${currentFilters.action}`);
        if (currentFilters.date_from) filters.push(`From: ${currentFilters.date_from}`);
        if (currentFilters.date_to) filters.push(`To: ${currentFilters.date_to}`);
        if (currentFilters.search) filters.push(`Search: "${currentFilters.search}"`);
        
        statusEl.innerHTML = `Menampilkan: <strong>${filteredLogs.length} logs</strong> dengan filter: ${filters.join(', ')}`;
    } else {
        statusEl.innerHTML = `Menampilkan: <strong>${filteredLogs.length} logs terakhir</strong>`;
    }
}

// ========================================
// EXPORT LOGS
// ========================================
function exportLogs() {
    if (filteredLogs.length === 0) {
        showMessageModal('Info', 'Tidak ada data untuk diekspor.', false);
        return;
    }
    
    // Simple CSV export
    let csv = 'ID,User,Role,Action,Description,IP Address,Timestamp\n';
    
    filteredLogs.forEach(log => {
        const time = new Date(log.created_at).toLocaleString('id-ID');
        csv += `${log.id},"${log.username}","${log.user_role}","${log.action}","${log.description.replace(/"/g, '""')}","${log.ip_address || '-'}","${time}"\n`;
    });
    
    // Download
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
function cleanOldLogs() {
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
                    loadLogs();
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
function refreshLogs() {
    showLoadingModal('Memperbarui logs...');
    loadLogs().then(() => {
        hideLoadingModal();
        showMessageModal('✅ Sukses', 'Logs berhasil diperbarui!', false);
    });
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getActionIcon(action) {
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

function getActionColor(action) {
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
window.loadLogs = loadLogs;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportLogs = exportLogs;
window.cleanOldLogs = cleanOldLogs;
window.refreshLogs = refreshLogs;
window.showLogDetail = showLogDetail;

console.log('✅ Activity Logs Viewer Module Loaded');
</script>