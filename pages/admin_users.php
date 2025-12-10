<!-- ============================================================================
FILE: pages/admin_users.php - Enhanced with Activity Logs
============================================================================ -->

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>👥 Manajemen Pengguna</h2>
        <div style="display: flex; gap: 8px;">
            <button class="btn success" onclick="showUserForm()">+ Tambah User Baru</button>
            <button class="btn" onclick="toggleActivityLogs()">📋 Activity Logs</button>
        </div>
    </div>
    <p class="small">Administrator dapat menambah, mengubah role, dan menonaktifkan akun pengguna SWIMS.</p>
</div>

<!-- Activity Logs Section (Hidden by default) -->
<div id="activityLogsSection" style="display:none;">
    <div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0;">📋 Recent Activity Logs</h3>
            <button class="btn btn-sm" onclick="refreshActivityLogs()">🔄 Refresh</button>
        </div>
        
        <!-- Simple Filters -->
        <div style="display: flex; gap: 12px; margin-bottom: 15px;">
            <select id="logUserFilter" onchange="filterActivityLogs()" style="flex: 1; margin: 0;">
                <option value="">-- Semua User --</option>
            </select>
            <select id="logActionFilter" onchange="filterActivityLogs()" style="flex: 1; margin: 0;">
                <option value="">-- Semua Action --</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE / DEACTIVATE</option>
            </select>
        </div>
        
        <div id="activityLogsContainer">
            <p style="text-align:center; color:var(--muted);">Memuat activity logs...</p>
        </div>
    </div>
</div>

<!-- User List Panel -->
<div id="userListPanel">
    <!-- Konten tabel user akan di-load di sini -->
    <div class="card">
        <p>Memuat daftar pengguna...</p>
    </div>
</div>

<script>
// ========================================
// GLOBAL STATE
// ========================================
let allActivityLogs = [];
let activityLogsVisible = false;

// ========================================
// TOGGLE ACTIVITY LOGS
// ========================================
function toggleActivityLogs() {
    const section = document.getElementById('activityLogsSection');
    activityLogsVisible = !activityLogsVisible;
    
    if (activityLogsVisible) {
        section.style.display = 'block';
        loadActivityLogsSimple();
    } else {
        section.style.display = 'none';
    }
}

// ========================================
// LOAD ACTIVITY LOGS (SIMPLE VERSION)
// ========================================
async function loadActivityLogsSimple() {
    const container = document.getElementById('activityLogsContainer');
    const userFilter = document.getElementById('logUserFilter');
    
    container.innerHTML = '<p style="text-align:center;">⏳ Memuat logs...</p>';
    
    try {
        // Fetch logs
        const logsResponse = await fetch('api/admin_activity.php?action=recent&limit=20');
        const logsData = await logsResponse.json();
        
        if (!logsData.success) {
            throw new Error(logsData.message);
        }
        
        allActivityLogs = logsData.data;
        
        // Populate user filter
        const users = await fetch('api/admin_user.php').then(r => r.json());
        if (users.success) {
            userFilter.innerHTML = '<option value="">-- Semua User --</option>';
            users.data.forEach(u => {
                userFilter.innerHTML += `<option value="${u.username}">${u.username} (${u.role})</option>`;
            });
        }
        
        // Render logs
        renderActivityLogs(allActivityLogs);
        
    } catch (error) {
        console.error('Load activity logs error:', error);
        container.innerHTML = `
            <p style="color:var(--danger); text-align:center;">❌ Gagal memuat logs: ${error.message}</p>
            <button class="btn btn-sm" onclick="loadActivityLogsSimple()">🔄 Coba Lagi</button>
        `;
    }
}

// ========================================
// RENDER ACTIVITY LOGS
// ========================================
function renderActivityLogs(logs) {
    const container = document.getElementById('activityLogsContainer');
    
    if (logs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--muted);">Tidak ada activity logs.</p>';
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    html += '<table class="table"><thead><tr>';
    html += '<th>User</th><th>Action</th><th>Description</th><th>IP</th><th>Time</th>';
    html += '</tr></thead><tbody>';
    
    logs.forEach(log => {
        const actionColor = getActionColor(log.action);
        const time = new Date(log.created_at).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <tr>
                <td><strong>${log.username}</strong></td>
                <td>
                    <span class="badge" style="background:${actionColor}; color:white; font-size:0.75rem;">
                        ${log.action}
                    </span>
                </td>
                <td style="max-width:300px;">${log.description}</td>
                <td class="small">${log.ip_address || '-'}</td>
                <td class="small">${time}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ========================================
// FILTER ACTIVITY LOGS
// ========================================
function filterActivityLogs() {
    const userFilter = document.getElementById('logUserFilter').value;
    const actionFilter = document.getElementById('logActionFilter').value;
    
    let filtered = allActivityLogs;
    
    if (userFilter) {
        filtered = filtered.filter(log => log.username === userFilter);
    }
    
    if (actionFilter) {
        filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    renderActivityLogs(filtered);
}

// ========================================
// REFRESH ACTIVITY LOGS
// ========================================
function refreshActivityLogs() {
    loadActivityLogsSimple();
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getActionColor(action) {
    const colors = {
        'LOGIN': '#10b981',
        'LOGOUT': '#6b7280',
        'CREATE': '#3b82f6',
        'UPDATE': '#f59e0b',
        'DELETE': '#ef4444',
        'DEACTIVATE': '#ef4444',
        'APPROVE': '#10b981',
        'REJECT': '#ef4444'
    };
    return colors[action] || '#6b7280';
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.toggleActivityLogs = toggleActivityLogs;
window.loadActivityLogsSimple = loadActivityLogsSimple;
window.refreshActivityLogs = refreshActivityLogs;
window.filterActivityLogs = filterActivityLogs;

console.log('✅ Admin Users Enhanced Page loaded');
</script>