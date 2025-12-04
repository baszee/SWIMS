/*
|--------------------------------------------------------------------------
| APLIKASI LOGIC (JS) - MIGRASI KE PHP SESSION/API
|--------------------------------------------------------------------------
| Semua fungsi akses data lokal (localStorage) diganti dengan Fetch ke API PHP.
| Data user kini dikelola oleh server PHP Session.
*/

// ---------- Storage helpers (Untuk cache lokal) ----------
function storageGet(key){ 
    try { 
        return JSON.parse(localStorage.getItem(key)); 
    } catch(e){ 
        return null; 
    } 
}

function storageSet(key, val){ 
    localStorage.setItem(key, JSON.stringify(val)); 
}

// ---------- Auth helpers (Berinteraksi dengan PHP Session) ----------

function currentUser(){ 
    // Ambil data user dari localStorage (hanya salinan/cache untuk rendering cepat)
    return storageGet('swims_current_user'); 
}

function renderUserBar(){
    const ub = document.getElementById('userBar');
    const user = currentUser();
    ub.innerHTML = '';
    
    if (!user){
        ub.innerHTML = `<span class="small">Belum login</span>`;
    } else {
        ub.innerHTML = `<span class="small">User: <b>${user.username}</b> &middot; <span class="role-badge">${user.role}</span></span>`;
    }
}

function renderMenu(){
    const menu = document.getElementById('menuBar');
    const user = currentUser();
    menu.innerHTML = '';
    
    if (!user){
        menu.innerHTML = `<button onclick="loadPage('login')">Login</button>`;
        return;
    }
    
    const role = user.role;
    let buttons = '';
    
    // Menu berdasarkan role
    if (role === 'staff'){
        buttons += `<button onclick="loadPage('staff')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('barang_masuk')">Barang Masuk</button>`;
        buttons += `<button onclick="loadPage('barang_keluar')">Barang Keluar</button>`;
        buttons += `<button onclick="loadPage('request_item')">Request Barang Baru</button>`;
    }
    
    if (role === 'supervisor'){
        buttons += `<button onclick="loadPage('supervisor')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('approval')">Approval Transaksi</button>`;
        buttons += `<button onclick="loadPage('approval_items')">Approval Barang Baru</button>`;
        buttons += `<button onclick="loadPage('notes')">Notes</button>`;
    }
    
    if (role === 'admin'){
        buttons += `<button onclick="loadPage('admin')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('admin_users')">User Management</button>`;
    }
    
    if (role === 'owner'){
        buttons += `<button onclick="loadPage('owner')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('notes')">Notes</button>`;
        buttons += `<button onclick="loadPage('owner_report')">Monitoring</button>`;
    }
    
    buttons += `<button style="margin-left:auto" onclick="logout()">Logout</button>`;
    menu.innerHTML = buttons;
}

// Fungsi untuk memeriksa status session di server dan memperbarui tampilan
async function checkSessionAndRender(){
    try {
        const response = await fetch('api/auth.php?action=check_session');
        const data = await response.json();
        
        if (data.logged_in) {
            // Jika login, simpan data user ke cache lokal (localStorage) untuk rendering
            storageSet('swims_current_user', data.user); 
            
            // Update UI
            renderUserBar();
            renderMenu();
            
            // Cek apakah sedang di halaman login atau belum ada halaman
            const currentHash = window.location.hash.replace('#', '');
            if (!currentHash || currentHash === 'login') {
                // Redirect ke dashboard sesuai role
                loadPage(roleLanding(data.user.role));
            } else {
                // Muat halaman yang ada di hash
                loadPage(currentHash);
            }
        } else {
            // Jika logout, bersihkan cache lokal dan pindah ke halaman login
            storageSet('swims_current_user', null);
            renderUserBar();
            renderMenu();
            loadPage('login');
        }
    } catch (error) {
        console.error('Error checking session:', error);
        // Fallback ke login jika ada error koneksi
        storageSet('swims_current_user', null);
        loadPage('login');
    }
}

// Fungsi Logout
async function logout(){
    if (!confirm('Apakah Anda yakin ingin logout?')) return;
    
    try {
        const response = await fetch('api/auth.php?action=logout');
        const data = await response.json();
        if (data.success) {
            alert('Logout Berhasil.');
            storageSet('swims_current_user', null);
            checkSessionAndRender(); // Bersihkan session dan pindah ke login
        } else {
            alert('Logout Gagal.');
        }
    } catch (error) {
        console.error('Error saat logout:', error);
        alert('Error saat logout. Silakan coba lagi.');
    }
}

// ---------- Page Access Control ----------
const ROLE_ALLOWED_PAGES = {
    'login': ['guest','staff','supervisor','admin','owner'],
    'staff': ['staff'],
    'barang_masuk': ['staff'],
    'barang_keluar': ['staff'],
    'request_item': ['staff'],
    'supervisor': ['supervisor'],
    'approval': ['supervisor'],
    'approval_items': ['supervisor'],
    'admin': ['admin'],
    'admin_users': ['admin'],
    'owner': ['owner'],
    'owner_report': ['owner'],
    'notes': ['supervisor','owner']
};

function roleLanding(role){
    if (role === 'staff') return 'staff';
    if (role === 'supervisor') return 'supervisor';
    if (role === 'admin') return 'admin';
    if (role === 'owner') return 'owner';
    return 'login';
}

function loadPage(page){
    // Update hash URL
    window.location.hash = page;
    
    // Load halaman
    fetch(`pages/${page}.php`) 
      .then(r => {
        if (!r.ok) throw new Error(`Halaman pages/${page}.php tidak ditemukan atau akses ditolak (403/404).`);
        return r.text();
      })
      .then(html => {
        document.getElementById('content').innerHTML = html;
        
        // Panggil init function jika ada
        if (typeof window['init_'+page] === 'function') {
            window['init_'+page]();
        }
      })
      .catch(err => {
        document.getElementById('content').innerHTML = `
          <div class="card">
            <h3 style="color: var(--danger);">❌ Error Loading Page</h3>
            <p>Halaman <strong>${page}</strong> tidak dapat dimuat.</p>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto;">${err}</pre>
            <button class="btn primary" onclick="loadPage('login')">Kembali ke Login</button>
          </div>
        `;
      });
}

// ---------- Page init functions ----------

/* init_login - Logic Login Form AJAX */
function init_login(){ 
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('loginMessage');
    if (!form) return;

    form.onsubmit = function(e){
        e.preventDefault();
        msg.textContent = 'Authenticating...';
        msg.style.color = '#2563eb';
        
        const username = document.getElementById('login_username').value.trim();
        const password = document.getElementById('login_password').value;
        const role = document.getElementById('login_role').value;
        
        // Validasi input
        if (!username || !password || !role) {
            msg.textContent = 'Semua field harus diisi!';
            msg.style.color = '#ef4444';
            return;
        }
        
        fetch('api/auth.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, role})
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // Login berhasil!
                msg.textContent = '✅ Login berhasil! Redirecting...';
                msg.style.color = '#16a34a';
                
                console.log('Login success as:', data.role);
                
                // Simpan data user ke localStorage (cache)
                storageSet('swims_current_user', {
                    username: username,
                    role: data.role
                });
                
                // Update UI
                renderUserBar();
                renderMenu();
                
                // REDIRECT KE DASHBOARD SESUAI ROLE
                setTimeout(() => {
                    const targetPage = roleLanding(data.role);
                    console.log('Redirecting to:', targetPage);
                    loadPage(targetPage);
                }, 800);
                
            } else {
                msg.textContent = '❌ ' + data.message;
                msg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            msg.textContent = '❌ Error koneksi server. Cek WAMP dan path API.';
            msg.style.color = '#ef4444';
            console.error('Login error:', err);
        });
    };
}

/* init_staff - Dashboard Staff */
function init_staff(){
    console.log('Staff dashboard loaded');
}

/* init_supervisor - Dashboard Supervisor */
function init_supervisor(){
    console.log('Supervisor dashboard loaded');
}

/* init_admin - Dashboard Admin */
function init_admin(){
    console.log('Admin dashboard loaded');
}

/* init_owner - Dashboard Owner */
function init_owner(){
    console.log('Owner dashboard loaded');
}

/* init_barang_masuk - Form Barang Masuk */
function init_barang_masuk(){
    const form = document.getElementById('formBarangMasuk');
    if (!form) return;
    
    // TODO: Load items ke dropdown
    const itemSelect = document.getElementById('bm_item');
    itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
    
    form.onsubmit = function(e){
        e.preventDefault();
        alert('Fitur Barang Masuk sedang dalam pengembangan. Data akan dikirim ke API PHP.');
        // TODO: Kirim data ke API
    };
}

/* init_barang_keluar - Form Barang Keluar */
function init_barang_keluar(){
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    // TODO: Load items ke dropdown
    const itemSelect = document.getElementById('bk_item');
    itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
    
    form.onsubmit = function(e){
        e.preventDefault();
        alert('Fitur Barang Keluar sedang dalam pengembangan. Data akan dikirim ke API PHP.');
        // TODO: Kirim data ke API
    };
}

/* init_approval - Approval Transaksi */
function init_approval(){
    console.log('Approval page loaded');
    // TODO: Load pending transactions
}

/* init_approval_items - Approval Item Baru */
function init_approval_items(){
    console.log('Approval items page loaded');
    // TODO: Load pending items
}

/* init_admin_users - User Management */
function init_admin_users(){
    console.log('Admin users page loaded');
    // TODO: Load user list
}

/* init_notes - Notes Page */
function init_notes(){
    console.log('Notes page loaded');
    // TODO: Load notes
}

/* init_owner_report - Owner Report */
function init_owner_report(){
    console.log('Owner report page loaded');
    // TODO: Load reports
}

/* init_request_item - Request Item Baru */
function init_request_item(){
    console.log('Request item page loaded');
    // TODO: Form request item baru
}

// ---------- Expose to global scope ----------
window.loadPage = loadPage;
window.renderUserBar = renderUserBar;
window.renderMenu = renderMenu;
window.currentUser = currentUser;
window.logout = logout;
window.checkSessionAndRender = checkSessionAndRender;
window.roleLanding = roleLanding;
window.storageGet = storageGet;
window.storageSet = storageSet;

// Expose init functions
window.init_login = init_login;
window.init_staff = init_staff;
window.init_supervisor = init_supervisor;
window.init_admin = init_admin;
window.init_owner = init_owner;
window.init_barang_masuk = init_barang_masuk;
window.init_barang_keluar = init_barang_keluar;
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.init_admin_users = init_admin_users;
window.init_notes = init_notes;
window.init_owner_report = init_owner_report;
window.init_request_item = init_request_item;

// Log untuk debugging
console.log('SWIMS App JS Loaded ✅');