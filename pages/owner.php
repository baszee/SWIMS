<style>
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .kpi-card { background: linear-gradient(135deg, var(--card-color) 0%, var(--card-color-dark) 100%); 
                color: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .kpi-label { font-size: 0.85rem; opacity: 0.9; margin-bottom: 8px; font-weight: 500; }
    .kpi-value { font-size: 2.5rem; font-weight: 700; margin: 8px 0; }
    .kpi-subtitle { font-size: 0.85rem; opacity: 0.8; margin-top: 8px; }
    .alert-card { padding: 16px; border-radius: 8px; border-left: 4px solid; margin-bottom: 12px; }
    .alert-critical { background: #fee2e2; border-color: #ef4444; }
    .alert-warning { background: #fef3c7; border-color: #f59e0b; }
    .alert-info { background: #dbeafe; border-color: #3b82f6; }
    .alert-success { background: #dcfce7; border-color: #10b981; }
    .chart-container { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
    .chart-title { font-size: 1.1rem; font-weight: 600; color: #1f2937; margin-bottom: 16px; }
    canvas { max-height: 300px !important; }
</style>

<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <h2 style="margin: 0; font-size: 2rem; color: #1f2937;">👑 Owner Dashboard</h2>
            <p style="margin: 5px 0 0 0; color: #6b7280;">Real-time warehouse performance monitoring</p>
        </div>
        <div style="display: flex; gap: 8px;">
            <select id="timeRangeSelector" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: white; font-weight: 500;">
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months" selected>Last 6 Months</option>
                <option value="1year">Last Year</option>
            </select>
            <button class="btn primary" id="refreshBtn" style="padding: 10px 16px;">
                🔄 Refresh
            </button>
        </div>
    </div>
</div>

<!-- KPI Cards -->
<div class="dashboard-grid" id="kpiCards">
    <!-- Will be populated by JavaScript -->
</div>

<!-- Alerts Section -->
<div id="alertsSection">
    <!-- Will be populated by JavaScript -->
</div>

<!-- Charts Section -->
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; margin-bottom: 20px;">
    <div class="chart-container">
        <h3 class="chart-title">📈 Stock Trend Analysis</h3>
        <canvas id="stockTrendChart"></canvas>
    </div>
    
    <div class="chart-container">
        <h3 class="chart-title">📊 Transaction Volume</h3>
        <canvas id="transactionVolumeChart"></canvas>
    </div>
</div>

<!-- Bottom Section -->
<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 20px;">
    <div class="chart-container">
        <h3 class="chart-title">🏢 Stock by Supplier</h3>
        <canvas id="supplierChart"></canvas>
    </div>
    
    <div id="topItemsSection" class="chart-container">
        <!-- Will be populated by JavaScript -->
    </div>
</div>

<!-- Quick Actions -->
<div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
    <h3 style="margin-top:0; color:#1e40af;">📋 Quick Actions</h3>
    <div style="display:flex; flex-wrap:wrap; gap:12px;">
        <button class="btn primary" data-action="inventory">📦 View Full Inventory</button>
        <button class="btn primary" data-action="history">📋 Transaction History</button>
        <button class="btn success" data-action="notes">📝 Notes Dashboard</button>
        <button class="btn" id="exportBtn">📄 Export Report</button>
    </div>
</div>

<script>
// ========================================
// CHART INSTANCES (Global)
// ========================================
let stockTrendChartInstance = null;
let transactionVolumeChartInstance = null;
let supplierChartInstance = null;

// ========================================
// EXPOSE FUNCTIONS IMMEDIATELY
// ========================================
window.loadOwnerDashboard = null; // Will be assigned below
window.exportDashboardReport = null; // Will be assigned below

// ========================================
// LOAD OWNER DASHBOARD
// ========================================
window.loadOwnerDashboard = async function() {
    const timeRange = document.getElementById('timeRangeSelector')?.value || '6months';
    
    showLoadingModal('Memuat dashboard data...');
    
    try {
        console.log('🔍 Fetching dashboard data from API...');
        const apiUrl = `api/report.php?action=owner_dashboard&period=${timeRange}`;
        console.log('   URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('   Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('   Raw response:', text.substring(0, 200) + '...');
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('   JSON Parse Error:', e);
            throw new Error('Invalid JSON response from API');
        }
        
        console.log('   Parsed data:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load dashboard data');
        }
        
        console.log('✅ Data loaded successfully');
        console.log('   KPIs:', data.data.kpis);
        console.log('   Trends:', data.data.trends);
        
        // Render all sections
        renderKPIs(data.data.kpis);
        renderAlerts(data.data.alerts);
        renderCharts(data.data.trends);
        renderSupplierAndTopItems(data.data.supplierBreakdown, data.data.topMovingItems);
        
        console.log('✅ Dashboard rendered successfully!');
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        
        document.getElementById('kpiCards').innerHTML = `
            <div class="card" style="grid-column: 1 / -1;">
                <h3 style="color:var(--danger); margin-top:0;">❌ Error Loading Dashboard</h3>
                <p style="color:var(--danger); font-weight:600;">${error.message}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:6px; margin:15px 0;">
                    <h4 style="margin-top:0;">🔧 Debug Steps:</h4>
                    <ol style="font-size:0.9rem; margin:0;">
                        <li>Buka <code>http://localhost/SWIMS/api/report.php?action=owner_dashboard&period=6months</code> di tab baru</li>
                        <li>Cek apakah JSON response valid</li>
                        <li>Cek Console (F12) → Network tab untuk detail</li>
                        <li>Pastikan file api/report.php sudah ter-update dengan fungsi baru</li>
                    </ol>
                </div>
                <button class="btn primary" onclick="loadOwnerDashboard()">🔄 Try Again</button>
            </div>
        `;
        
        // Clear other sections
        document.getElementById('alertsSection').innerHTML = '';
    } finally {
        hideLoadingModal();
    }
};

// ========================================
// RENDER KPIs
// ========================================
function renderKPIs(kpis) {
    
    const container = document.getElementById('kpiCards');
    
    const kpiConfigs = [
        { title: 'Total Stock Value', value: kpis.totalStock, subtitle: 'Units in warehouse', color: '#3b82f6', colorDark: '#2563eb' },
        { title: 'Active SKUs', value: kpis.totalItems, subtitle: 'Approved items', color: '#10b981', colorDark: '#059669' },
        { title: 'Stock Turnover', value: kpis.stockTurnover + 'x', subtitle: 'Per month average', color: '#8b5cf6', colorDark: '#7c3aed' },
        { title: 'Fulfillment Rate', value: kpis.fulfillmentRate + '%', subtitle: 'Order completion', color: '#ec4899', colorDark: '#db2777' }
    ];
    
    container.innerHTML = kpiConfigs.map(config => `
        <div class="kpi-card" style="--card-color: ${config.color}; --card-color-dark: ${config.colorDark};">
            <div class="kpi-label">${config.title}</div>
            <div class="kpi-value">${typeof config.value === 'number' ? config.value.toLocaleString() : config.value}</div>
            <div class="kpi-subtitle">${config.subtitle}</div>
        </div>
    `).join('');
}

// ========================================
// RENDER ALERTS
// ========================================
function renderAlerts(alerts) {
    
    const container = document.getElementById('alertsSection');
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const alertStyles = {
        'critical': { class: 'alert-critical', color: '#ef4444' },
        'warning': { class: 'alert-warning', color: '#f59e0b' },
        'info': { class: 'alert-info', color: '#3b82f6' },
        'success': { class: 'alert-success', color: '#10b981' }
    };
    
    let html = `
        <div class="card" style="margin-bottom: 20px;">
            <h3 style="margin-top: 0; font-size: 1.3rem;">🚨 Active Alerts & Notifications</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; margin-top: 16px;">
    `;
    
    alerts.forEach(alert => {
        const style = alertStyles[alert.type] || alertStyles['info'];
        
        html += `
            <div class="alert-card ${style.class}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0; font-weight: 600; font-size: 1rem;">${alert.title}</h4>
                        <p style="margin: 8px 0 0 0; font-size: 0.9rem; color: #4b5563;">${alert.message}</p>
                    </div>
                    ${alert.count !== null ? `<span style="font-weight: 700; font-size: 1.8rem; color: ${style.color};">${alert.count}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
}

// ========================================
// RENDER CHARTS (Simple HTML Tables)
// ========================================
function renderCharts(trends) {
    
    const container = document.getElementById('chartsSection');
    
    // Stock Trend Table
    let stockTrendHtml = '<div class="card"><h3>📈 Stock Trend Analysis</h3><table class="table"><thead><tr><th>Month</th><th>Stock</th><th>Inflow</th><th>Outflow</th></tr></thead><tbody>';
    
    trends.stockTrend.forEach(item => {
        stockTrendHtml += `
            <tr>
                <td><b>${item.month}</b></td>
                <td>${item.stock.toLocaleString()}</td>
                <td style="color:var(--success);">${item.inflow.toLocaleString()}</td>
                <td style="color:var(--danger);">${item.outflow.toLocaleString()}</td>
            </tr>
        `;
    });
    
    stockTrendHtml += '</tbody></table></div>';
    
    // Transaction Volume Table
    let volumeHtml = '<div class="card"><h3>📊 Transaction Volume</h3><table class="table"><thead><tr><th>Month</th><th>Approved</th><th>Rejected</th><th>Pending</th></tr></thead><tbody>';
    
    trends.transactionVolume.forEach(item => {
        volumeHtml += `
            <tr>
                <td><b>${item.month}</b></td>
                <td style="color:var(--success);">${item.approved}</td>
                <td style="color:var(--danger);">${item.rejected}</td>
                <td style="color:var(--warning);">${item.pending}</td>
            </tr>
        `;
    });
    
    volumeHtml += '</tbody></table></div>';
    
    container.innerHTML = stockTrendHtml + volumeHtml;
}

// ========================================
// RENDER SUPPLIER & TOP ITEMS
// ========================================
function renderSupplierAndTopItems(suppliers, topItems) {
    
    const container = document.getElementById('bottomSection');
    
    // Supplier Breakdown
    let supplierHtml = '<div class="card"><h3>🏢 Stock by Supplier</h3><table class="table" style="margin-top:15px;"><thead><tr><th>Supplier</th><th style="text-align:right;">Stock</th></tr></thead><tbody>';
    
    suppliers.forEach(s => {
        supplierHtml += `
            <tr>
                <td><b>${s.name}</b></td>
                <td style="text-align:right; font-weight:600;">${s.value.toLocaleString()}</td>
            </tr>
        `;
    });
    
    supplierHtml += '</tbody></table></div>';
    
    // Top Moving Items
    let topItemsHtml = '<div class="card"><h3>🔥 Top Moving Items</h3><div style="margin-top:15px;">';
    
    topItems.forEach((item, index) => {
        const trendIcon = item.trend === 'up' ? '📈' : item.trend === 'down' ? '📉' : '➡️';
        const trendColor = item.trend === 'up' ? 'var(--success)' : item.trend === 'down' ? 'var(--danger)' : 'var(--muted)';
        
        topItemsHtml += `
            <div style="padding:12px; background:#f8fafc; border-radius:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <p style="margin:0; font-weight:600;">#${index + 1} ${item.name}</p>
                    <p style="margin:5px 0 0 0; font-size:0.85rem; color:var(--muted);">${item.sku}</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-weight:700; font-size:1.2rem;">${item.movement}</p>
                    <p style="margin:5px 0 0 0; font-size:0.85rem; color:${trendColor};">${trendIcon} ${item.change}</p>
                </div>
            </div>
        `;
    });
    
    topItemsHtml += '</div></div>';
    
    container.innerHTML = supplierHtml + topItemsHtml;
}

// ========================================
// EXPORT REPORT (Simple CSV)
// ========================================
window.exportDashboardReport = function() {
    showMessageModal('Export Report', 'Fitur export report dalam pengembangan. Untuk sementara gunakan browser Print (Ctrl+P).', false);
};

// ========================================
// INIT FUNCTION
// ========================================
window.init_owner = function() {
    console.log('🚀 [OWNER] Initializing dashboard...');
    
    // Attach event listeners
    const refreshBtn = document.getElementById('refreshBtn');
    const timeRangeSelector = document.getElementById('timeRangeSelector');
    const exportBtn = document.getElementById('exportBtn');
    const actionButtons = document.querySelectorAll('[data-action]');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('🔄 Refresh button clicked');
            window.loadOwnerDashboard();
        });
        console.log('✅ Refresh button listener attached');
    }
    
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', function() {
            console.log('📅 Time range changed to:', this.value);
            window.loadOwnerDashboard();
        });
        console.log('✅ Time range selector listener attached');
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            console.log('📄 Export button clicked');
            window.exportDashboardReport();
        });
        console.log('✅ Export button listener attached');
    }
    
    // Quick action buttons
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            console.log('🎯 Quick action:', action);
            
            const pageMap = {
                'inventory': 'inventory',
                'history': 'history_transaksi',
                'notes': 'notes'
            };
            
            if (pageMap[action] && typeof loadPage === 'function') {
                loadPage(pageMap[action]);
            }
        });
    });
    console.log('✅ Quick action buttons listener attached');
    
    // Load dashboard
    console.log('📊 Loading dashboard data...');
    window.loadOwnerDashboard();
};

console.log('✅ [OWNER] Dashboard module loaded');
</script>