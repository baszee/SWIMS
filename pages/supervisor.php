<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem;">📊</span> Supervisor Dashboard
        </h2>
    </div>
    <p class="small">Selamat datang, <b id="supervisorName"></b>. Gunakan menu untuk menyetujui transaksi dan data master baru.</p>
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
    // ========================================
    // INIT SUPERVISOR DASHBOARD
    // ========================================
    async function loadSupervisorDashboard() {
        console.log('🚀 Init Supervisor Dashboard v2.0');
        
        const user = currentUser();
        if (!user) {
            console.error('❌ User not found!');
            loadPage('login');
            return;
        }
        
        console.log('✅ User found:', user);
        
        // Set nama supervisor
        const nameEl = document.getElementById('supervisorName');
        if (nameEl) {
            nameEl.textContent = user.username;
            console.log('✅ Supervisor name set:', user.username);
        } else {
            console.error('❌ supervisorName element not found');
        }
        
        // Load statistik
        await loadSupervisorStats();
    }
    
    // ========================================
    // LOAD SUPERVISOR STATISTICS
    // ========================================
    async function loadSupervisorStats() {
        const statsDiv = document.getElementById('supervisorStats');
        if (!statsDiv) {
            console.error('❌ supervisorStats div not found!');
            return;
        }
        
        console.log('📊 Loading supervisor stats...');
        statsDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Mengambil data...</p></div>';
        
        showLoadingModal('Mengambil statistik...');
        
        try {
            console.log('🔄 Fetching approval data from APIs...');
            
            // Fetch dengan timeout
            const fetchWithTimeout = (url, timeout = 5000) => {
                return Promise.race([
                    fetch(url),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), timeout)
                    )
                ]);
            };
            
            // Fetch semua data pending
            console.log('📡 Fetching transactions...');
            const transRes = await fetchWithTimeout('api/approval.php?action=transactions');
            console.log('✅ Trans response:', transRes.status, transRes.ok);
            
            console.log('📡 Fetching items...');
            const itemsRes = await fetchWithTimeout('api/approval.php?action=items');
            console.log('✅ Items response:', itemsRes.status, itemsRes.ok);
            
            console.log('📡 Fetching suppliers...');
            const suppliersRes = await fetchWithTimeout('api/approval.php?action=suppliers');
            console.log('✅ Suppliers response:', suppliersRes.status, suppliersRes.ok);
            
            // Parse responses
            const transData = await transRes.json();
            console.log('📦 Trans data:', transData);
            
            const itemsData = await itemsRes.json();
            console.log('📦 Items data:', itemsData);
            
            const suppliersData = await suppliersRes.json();
            console.log('📦 Suppliers data:', suppliersData);
            
            // Hitung statistik
            const pendingIn = transData.success ? transData.data.filter(t => t.type === 'IN').length : 0;
            const pendingOut = transData.success ? transData.data.filter(t => t.type === 'OUT').length : 0;
            const pendingMasters = (itemsData.success ? itemsData.data.length : 0) + 
                                   (suppliersData.success ? suppliersData.data.length : 0);
            
            console.log('📊 Statistics calculated:', {
                pendingIn,
                pendingOut,
                pendingMasters
            });
            
            // Render kartu statistik
            statsDiv.innerHTML = `
                <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="stat-label">Pending Barang Masuk</div>
                    <div class="stat-value">${pendingIn}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Menunggu persetujuan</p>
                </div>
                <div class="stat-box" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="stat-label">Pending Barang Keluar</div>
                    <div class="stat-value">${pendingOut}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Menunggu persetujuan</p>
                </div>
                <div class="stat-box danger" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="stat-label">Pending Barang/Klien Baru</div>
                    <div class="stat-value">${pendingMasters}</div>
                    <p class="small" style="margin-top:8px; opacity:0.9;">Item & Supplier baru</p>
                </div>
            `;
            
            console.log('✅ Statistics rendered successfully!');
            
        } catch (error) {
            console.error('❌ Supervisor stats error:', error);
            statsDiv.innerHTML = `
                <div class="card">
                    <p style="color:var(--danger);">❌ Error memuat statistik: ${error.message}</p>
                    <p class="small">Pastikan:</p>
                    <ul class="small">
                        <li>WAMP/XAMPP sudah running</li>
                        <li>File api/approval.php tersedia</li>
                        <li>Database terkoneksi</li>
                    </ul>
                    <button class="btn primary btn-sm" onclick="loadSupervisorStats()">🔄 Coba Lagi</button>
                </div>
            `;
        } finally {
            hideLoadingModal();
        }
    }
    
    // Expose functions
    window.loadSupervisorStats = loadSupervisorStats;
    window.init_supervisor = loadSupervisorDashboard;
    
    // Auto-call when page loads
    console.log('🚀 Auto-calling init_supervisor...');
    loadSupervisorDashboard();
</script>