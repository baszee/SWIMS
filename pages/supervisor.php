<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem;">📊</span> Supervisor Dashboard
        </h2>
    </div>
    <p class="small">Selamat datang, <b id="supervisorName">Loading...</b>. Gunakan menu untuk menyetujui transaksi dan data master baru.</p>
</div>

<!-- Statistik Dashboard -->
<div id="supervisorStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom: 20px;">
    <div class="card"><p style="text-align:center;">⏳ Memuat statistik...</p></div>
</div>

<!-- Quick Links -->
<div class="card">
    <h3>Quick Actions</h3>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn primary" onclick="loadPage('approval')">
            <span style="font-size:1.2rem;">✅</span> Approval Transaksi
        </button>
        <button class="btn primary" onclick="loadPage('approval_items')">
            <span style="font-size:1.2rem;">📦</span> Approval Barang/Klien Baru
        </button>
        <button class="btn success" onclick="loadPage('notes')">
            <span style="font-size:1.2rem;">📝</span> Notes Internal
        </button>
    </div>
</div>

<!-- Tips Supervisor -->
<div class="card" style="background:#f0f9ff; border-left:4px solid #3b82f6;">
    <h3 style="margin-top:0; color:#1e40af;">💡 Tips Supervisor</h3>
    <ul style="margin:0; padding-left:20px; color:#1e3a8a;">
        <li>Periksa <strong>Approval Transaksi</strong> untuk menyetujui Barang Masuk/Keluar dari Staff</li>
        <li>Periksa <strong>Approval Barang Baru</strong> untuk menyetujui Item dan Klien/Supplier yang diajukan Staff</li>
        <li>Setiap transaksi yang di-approve akan mendapat <strong>QR Code Nota</strong> untuk verifikasi</li>
        <li>Gunakan <strong>Notes</strong> untuk komunikasi dengan Owner dan Supervisor lain</li>
    </ul>
</div>

<script>
console.log('='.repeat(60));
console.log('🚀 SUPERVISOR DASHBOARD v5.0 - SCOPE FIX');
console.log('='.repeat(60));

// ========================================
// INIT SUPERVISOR DASHBOARD
// ========================================
async function loadSupervisorDashboard() {
    console.log('📍 Step 1: Check current user...');
    
    const user = currentUser();
    if (!user) {
        console.error('❌ User not found! Redirecting to login...');
        loadPage('login');
        return;
    }
    
    console.log('✅ User authenticated:', {
        username: user.username,
        role: user.role
    });
    
    // Set nama supervisor
    const nameEl = document.getElementById('supervisorName');
    if (nameEl) {
        nameEl.textContent = user.username;
        console.log('✅ Supervisor name displayed');
    }
    
    console.log('📍 Step 2: Load statistics...');
    await loadSupervisorStats();
    
    console.log('✅ Dashboard initialization complete!');
}

// ========================================
// LOAD SUPERVISOR STATISTICS
// ========================================
async function loadSupervisorStats() {
    const statsDiv = document.getElementById('supervisorStats');
    if (!statsDiv) {
        console.error('❌ CRITICAL: supervisorStats div not found!');
        return;
    }
    
    console.log('📊 Loading supervisor statistics...');
    
    // Show initial loading state
    statsDiv.innerHTML = `
        <div class="card" style="grid-column: 1 / -1;">
            <p style="text-align:center;">
                <span style="font-size:2rem;">⏳</span><br>
                Mengambil data statistik...
            </p>
        </div>
    `;
    
    showLoadingModal('Memuat statistik Supervisor...');
    
    // Initialize counters with defaults
    let stats = {
        pendingIn: 0,
        pendingOut: 0,
        pendingItems: 0,
        pendingSuppliers: 0
    };
    
    let errors = [];
    
    try {
        console.log('📡 Fetching from: api/approval.php?action=transactions');
        
        // Fetch 1: Transactions
        try {
            const transRes = await fetch('api/approval.php?action=transactions', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('  → Response status:', transRes.status);
            
            if (!transRes.ok) {
                throw new Error(`HTTP ${transRes.status}: ${transRes.statusText}`);
            }
            
            const transData = await transRes.json();
            console.log('  → Response data:', transData);
            
            if (transData.success && Array.isArray(transData.data)) {
                stats.pendingIn = transData.data.filter(t => t.type === 'IN').length;
                stats.pendingOut = transData.data.filter(t => t.type === 'OUT').length;
                console.log('  ✅ Transactions loaded:', {
                    total: transData.data.length,
                    IN: stats.pendingIn,
                    OUT: stats.pendingOut
                });
            } else {
                console.warn('  ⚠️ Unexpected response format:', transData);
            }
        } catch (error) {
            console.error('  ❌ Transactions fetch failed:', error);
            errors.push('Transaksi: ' + error.message);
        }
        
        // Fetch 2: Items
        console.log('📡 Fetching from: api/approval.php?action=items');
        try {
            const itemsRes = await fetch('api/approval.php?action=items', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('  → Response status:', itemsRes.status);
            
            if (!itemsRes.ok) {
                throw new Error(`HTTP ${itemsRes.status}: ${itemsRes.statusText}`);
            }
            
            const itemsData = await itemsRes.json();
            console.log('  → Response data:', itemsData);
            
            if (itemsData.success && Array.isArray(itemsData.data)) {
                stats.pendingItems = itemsData.data.length;
                console.log('  ✅ Items loaded:', stats.pendingItems);
            } else {
                console.warn('  ⚠️ Unexpected response format:', itemsData);
            }
        } catch (error) {
            console.error('  ❌ Items fetch failed:', error);
            errors.push('Item: ' + error.message);
        }
        
        // Fetch 3: Suppliers
        console.log('📡 Fetching from: api/approval.php?action=suppliers');
        try {
            const suppliersRes = await fetch('api/approval.php?action=suppliers', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('  → Response status:', suppliersRes.status);
            
            if (!suppliersRes.ok) {
                throw new Error(`HTTP ${suppliersRes.status}: ${suppliersRes.statusText}`);
            }
            
            const suppliersData = await suppliersRes.json();
            console.log('  → Response data:', suppliersData);
            
            if (suppliersData.success && Array.isArray(suppliersData.data)) {
                stats.pendingSuppliers = suppliersData.data.length;
                console.log('  ✅ Suppliers loaded:', stats.pendingSuppliers);
            } else {
                console.warn('  ⚠️ Unexpected response format:', suppliersData);
            }
        } catch (error) {
            console.error('  ❌ Suppliers fetch failed:', error);
            errors.push('Supplier: ' + error.message);
        }
        
        console.log('📊 Final statistics:', stats);
        
        // Render statistics cards
        let html = `
            <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Barang Masuk</div>
                <div class="stat-value">${stats.pendingIn}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Transaksi IN menunggu approval</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Barang Keluar</div>
                <div class="stat-value">${stats.pendingOut}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Transaksi OUT menunggu approval</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <div class="stat-label">Pending Item Baru</div>
                <div class="stat-value">${stats.pendingItems}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Item menunggu approval</p>
            </div>
            <div class="stat-box" style="background:linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
                <div class="stat-label">Pending Supplier Baru</div>
                <div class="stat-value">${stats.pendingSuppliers}</div>
                <p class="small" style="margin-top:8px; opacity:0.9;">Supplier menunggu approval</p>
            </div>
        `;
        
        // Show errors if any
        if (errors.length > 0) {
            html += `
                <div class="card" style="grid-column: 1 / -1; background:#fef3c7; border-color:#f59e0b;">
                    <h4 style="margin-top:0; color:#92400e;">⚠️ Beberapa Data Gagal Dimuat</h4>
                    <ul class="small" style="margin:5px 0; color:#78350f;">
                        ${errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                    <button class="btn primary btn-sm" onclick="loadSupervisorStats()">🔄 Coba Lagi</button>
                </div>
            `;
        }
        
        statsDiv.innerHTML = html;
        console.log('✅ Statistics rendered successfully!');
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error);
        
        statsDiv.innerHTML = `
            <div class="card" style="grid-column: 1 / -1;">
                <h3 style="color:var(--danger); margin-top:0;">❌ Error Memuat Dashboard</h3>
                <p style="color:var(--danger); font-weight:600;">${error.message}</p>
                
                <div style="background:#f8fafc; padding:15px; border-radius:6px; margin:15px 0;">
                    <h4 style="margin-top:0;">🔧 Troubleshooting Checklist:</h4>
                    <ol class="small" style="margin:0;">
                        <li><strong>WAMP/XAMPP:</strong> Pastikan sudah running (icon hijau)</li>
                        <li><strong>Database:</strong> Cek phpMyAdmin → database 'swims_db' ada</li>
                        <li><strong>File API:</strong> Cek file <code>api/approval.php</code> ada</li>
                        <li><strong>Session:</strong> Pastikan sudah login sebagai Supervisor</li>
                        <li><strong>Console:</strong> Buka DevTools (F12) → Console untuk detail error</li>
                    </ol>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <button class="btn primary" onclick="loadSupervisorStats()">🔄 Reload Statistics</button>
                    <button class="btn" onclick="logout()">🚪 Logout & Login Ulang</button>
                </div>
            </div>
        `;
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ========================================
window.loadSupervisorStats = loadSupervisorStats;
window.init_supervisor = loadSupervisorDashboard;

console.log('✅ Functions exposed to global scope:');
console.log('  - window.loadSupervisorStats:', typeof window.loadSupervisorStats);
console.log('  - window.init_supervisor:', typeof window.init_supervisor);

// ========================================
// AUTO-INITIALIZE
// ========================================
console.log('📍 Starting auto-initialization...');

// Use setTimeout to ensure DOM is ready and other scripts loaded
setTimeout(() => {
    console.log('📍 Calling loadSupervisorDashboard...');
    loadSupervisorDashboard();
}, 100);
</script>