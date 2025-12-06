<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem;">📊</span> Supervisor Dashboard
        </h2>
    </div>
    <p class="small">Selamat datang, <b id="supervisorName"></b>. Gunakan menu untuk menyetujui transaksi dan data master baru.</p>
</div>

<!-- Statistik Dashboard (3 Kartu seperti referensi) -->
<div id="supervisorStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom: 20px;">
    <!-- Kartu Statistik akan dimuat oleh init_supervisor() -->
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

<!-- Ringkasan Aktivitas Terkini (Opsional) -->
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
        const user = currentUser();
        if (!user) {
            loadPage('login');
            return;
        }
        
        // Set nama supervisor
        const nameEl = document.getElementById('supervisorName');
        if (nameEl) {
            nameEl.textContent = user.username;
        }
        
        // Load statistik
        await loadSupervisorStats();
    }
    
    // Auto-call when page loads
    if (typeof window.init_supervisor === 'function') {
        window.init_supervisor = loadSupervisorDashboard;
    } else {
        // Jika init_supervisor belum didefinisikan, define sekarang
        window.init_supervisor = loadSupervisorDashboard;
        loadSupervisorDashboard(); // Call langsung
    }
    
    // ========================================
    // LOAD SUPERVISOR STATISTICS
    // ========================================
    async function loadSupervisorStats() {
        const statsDiv = document.getElementById('supervisorStats');
        if (!statsDiv) return;
        
        statsDiv.innerHTML = '<div class="card"><p style="text-align:center;">Mengambil data...</p></div>';
        
        showLoadingModal('Mengambil statistik approval...');
        
        try {
            // Fetch semua data pending sekaligus
            const [transRes, itemsRes, suppliersRes] = await Promise.all([
                fetch('api/approval.php?action=transactions'),
                fetch('api/approval.php?action=items'),
                fetch('api/approval.php?action=suppliers')
            ]);
            
            const transData = await transRes.json();
            const itemsData = await itemsRes.json();
            const suppliersData = await suppliersRes.json();
            
            // Hitung statistik
            const pendingIn = transData.success ? transData.data.filter(t => t.type === 'IN').length : 0;
            const pendingOut = transData.success ? transData.data.filter(t => t.type === 'OUT').length : 0;
            const pendingMasters = (itemsData.success ? itemsData.data.length : 0) + 
                                   (suppliersData.success ? suppliersData.data.length : 0);
            
            // Render kartu statistik (mirip referensi visual)
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
            
        } catch (error) {
            statsDiv.innerHTML = `
                <div class="card">
                    <p style="color:var(--danger);">❌ Error memuat statistik: ${error.message}</p>
                    <p class="small">Pastikan API approval.php berfungsi dengan baik.</p>
                </div>
            `;
            console.error('Supervisor stats error:', error);
        } finally {
            hideLoadingModal();
        }
    }
    
    // Expose function
    window.loadSupervisorStats = loadSupervisorStats;
</script>