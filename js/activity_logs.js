/**
 * =========================================================
 * ACTIVITY_LOGS.JS - EXTERNAL MODULE v1.0
 * Purpose: Activity Logs Management for Admin
 * =========================================================
 */

console.log('📋 [ACTIVITY_LOGS.JS] Loading...');

(function() {
    'use strict';
    
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
        console.log('🚀 [ACTIVITY_LOGS] Initializing...');
        
        try {
            await Promise.all([
                loadUsersActivityList(),
                loadActivityLogs()
            ]);
            
            console.log('✅ [ACTIVITY_LOGS] Initialized successfully');
        } catch (error) {
            console.error('❌ [ACTIVITY_LOGS] Init error:', error);
            showMessageModal('Error', 'Gagal menginisialisasi Activity Logs: ' + error.message, false);
        }
    }

    // ========================================
    // LOAD USERS LIST
    // ========================================
    async function loadUsersActivityList() {
        try {
            console.log('📡 [ACTIVITY_LOGS] Fetching users list...');
            const response = await fetch('api/admin_activity.php?action=users');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load users');
            }
            
            usersActivityList = data.data;
            
            const userFilter = document.getElementById('filterUser');
            if (userFilter) {
                userFilter.innerHTML = '<option value="">-- Semua User --</option>';
                
                usersActivityList.forEach(user => {
                    userFilter.innerHTML += `
                        <option value="${user.id}">${user.username} (${user.role})</option>
                    `;
                });
            }
            
            console.log('✅ [ACTIVITY_LOGS] Users list loaded:', usersActivityList.length);
            
        } catch (error) {
            console.error('❌ [ACTIVITY_LOGS] Load users error:', error);
        }
    }

    // ========================================
    // LOAD ACTIVITY LOGS
    // ========================================
    async function loadActivityLogs() {
        const container = document.getElementById('activityLogsContainer');
        if (!container) {
            console.error('❌ [ACTIVITY_LOGS] Container not found!');
            return;
        }
        
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
            
            console.log('📡 [ACTIVITY_LOGS] Fetching from:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load logs');
            }
            
            allActivityLogs = data.data;
            filteredActivityLogs = allActivityLogs;
            
            console.log('✅ [ACTIVITY_LOGS] Logs loaded:', allActivityLogs.length);
            
            renderActivityLogsTable(filteredActivityLogs);
            updateActivityFilterStatus();
            updateActivityStats();
            
        } catch (error) {
            console.error('❌ [ACTIVITY_LOGS] Load logs error:', error);
            container.innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <p style="color:var(--danger); font-weight:600;">❌ Error: ${error.message}</p>
                    <button class="btn primary btn-sm" onclick="window.loadActivityLogs()">🔄 Coba Lagi</button>
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
        
        const statTotal = document.getElementById('statTotal');
        if (statTotal) {
            statTotal.textContent = total.toLocaleString();
        }
        
        const actionCount = {};
        filteredActivityLogs.forEach(log => {
            actionCount[log.action] = (actionCount[log.action] || 0) + 1;
        });
        
        const statsContainer = document.getElementById('activityStatsCards');
        if (!statsContainer) return;
        
        const sortedActions = Object.entries(actionCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
        
        let statsHTML = `
            <div class="card" style="text-align:center;">
                <p class="small" style="margin:0; color:var(--muted);">Total Logs</p>
                <p style="font-size:2rem; font-weight:700; margin:5px 0; color:var(--primary);">${total.toLocaleString()}</p>
            </div>
        `;
        
        sortedActions.forEach(([action, count]) => {
            const icon = getActivityActionIcon(action);
            const color = getActivityActionColor(action);
            
            statsHTML += `
                <div class="card" style="text-align:center;">
                    <p class="small" style="margin:0; color:${color};">${icon} ${action}</p>
                    <p style="font-size:2rem; font-weight:700; margin:5px 0; color:${color};">${count}</p>
                </div>
            `;
        });
        
        statsContainer.innerHTML = statsHTML;
    }

    // ========================================
    // RENDER LOGS TABLE
    // ========================================
    function renderActivityLogsTable(logs) {
        const container = document.getElementById('activityLogsContainer');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <p style="font-size:3rem; margin:0;">📭</p>
                    <p style="color:var(--muted); font-weight:600;">Tidak ada log yang sesuai filter</p>
                    <button class="btn primary btn-sm" onclick="window.resetActivityFilters()">Reset Filter</button>
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
                        <span class="role-badge" style="font-size:0.7rem;">${log.user_role || 'N/A'}</span>
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
                        ${log.metadata ? `<button class="btn btn-sm" onclick='window.showActivityLogDetail(${JSON.stringify(log).replace(/'/g, "&apos;")})'>👁️</button>` : '-'}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
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
        const userEl = document.getElementById('filterUser');
        const actionEl = document.getElementById('filterAction');
        const dateFromEl = document.getElementById('filterDateFrom');
        const dateToEl = document.getElementById('filterDateTo');
        const searchEl = document.getElementById('searchBox');
        
        currentActivityFilters = {
            user_id: userEl ? userEl.value || null : null,
            action: actionEl ? actionEl.value || null : null,
            date_from: dateFromEl ? dateFromEl.value || null : null,
            date_to: dateToEl ? dateToEl.value || null : null,
            search: searchEl ? searchEl.value.trim() || null : null
        };
        
        console.log('🔍 [ACTIVITY_LOGS] Applying filters:', currentActivityFilters);
        loadActivityLogs();
    }

    function resetActivityFilters() {
        const elements = {
            filterUser: document.getElementById('filterUser'),
            filterAction: document.getElementById('filterAction'),
            filterDateFrom: document.getElementById('filterDateFrom'),
            filterDateTo: document.getElementById('filterDateTo'),
            searchBox: document.getElementById('searchBox')
        };
        
        if (elements.filterUser) elements.filterUser.value = '';
        if (elements.filterAction) elements.filterAction.value = '';
        if (elements.filterDateFrom) elements.filterDateFrom.value = '';
        if (elements.filterDateTo) elements.filterDateTo.value = '';
        if (elements.searchBox) elements.searchBox.value = '';
        
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
        if (!statusEl) return;
        
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
    // EXPOSE TO GLOBAL WINDOW
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

    console.log('✅ [ACTIVITY_LOGS.JS] Module loaded & exposed');

})();