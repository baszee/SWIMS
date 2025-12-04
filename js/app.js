/*
|--------------------------------------------------------------------------
| APLIKASI LOGIC (JS) - MIGRASI KE PHP SESSION/API
|--------------------------------------------------------------------------
| Semua fungsi akses data lokal (localStorage) diganti dengan Fetch ke API PHP.
| Data user kini dikelola oleh server PHP Session.
*/

// ---------- Storage helpers (DITINGGALKAN, HANYA UNTUK KEPERLUAN FALLBACK/DEMO LOKAL) ----------
function storageGet(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }
function storageSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// ---------- Auth helpers (BARU: Berinteraksi dengan PHP Session) ----------

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
        ub.innerHTML = `<span class="small">User: <b>${user.username}</b> &middot; <span class="role-badge">${user.role}</span></span>
                        <button class="btn" style="margin-left:10px" onclick="logout()">Logout</button>`;
    }
}

function renderMenu(){
    const menu = document.getElementById('menuBar');
    const user = currentUser();
    menu.innerHTML = '';
    
    // Logic menu rendering (Sama seperti versi lama, tetapi kini berdasarkan currentUser() yang dicache dari PHP)
    if (!user){
        menu.innerHTML = `<button onclick="loadPage('login')">Login</button>`;
        return;
    }
    const role = user.role;
    let buttons = '';
    
    // ... (Logika menu berdasarkan role Anda di sini - Tetap sama seperti versi lama) ...
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
            
            // Muat halaman dashboard yang sesuai dengan role jika halaman saat ini 'login'
            if (window.location.hash.includes('login') || !currentUser()) {
                loadPage(roleLanding(data.user.role));
            } else {
                // Muat ulang menu & userbar
                renderUserBar();
                renderMenu();
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
    try {
        const response = await fetch('api/auth.php?action=logout');
        const data = await response.json();
        if (data.success) {
            alert('Logout Berhasil.');
            checkSessionAndRender(); // Bersihkan session dan pindah ke login
        } else {
            alert('Logout Gagal.');
        }
    } catch (error) {
        console.error('Error saat logout:', error);
    }
}

// ---------- Page Access Control (Tinggal dipanggil dari PHP) ----------
// Logic ini akan diimplementasikan di sisi PHP agar lebih aman.
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
    // ... (Hapus Pengecekan Akses JS, karena kini dilakukan oleh PHP di sisi server) ...
    // ...
    
    // GANTI KE .php
    fetch(`pages/${page}.php`) 
      .then(r => {
        if (!r.ok) throw new Error(`Halaman pages/${page}.php tidak ditemukan atau akses ditolak (403/404).`);
        return r.text();
      })
      .then(html => {
        document.getElementById('content').innerHTML = html;
        // Panggil init function jika ada
        if (typeof window['init_'+page] === 'function') window['init_'+page]();
      })
      .catch(err => {
        document.getElementById('content').innerHTML = `<div class="card"><h3>Error loading page</h3><pre>${err}</pre></div>`;
      });
}


// ---------- Page init functions (Di sini kita mulai refactor AJAX/DB) ----------

/* init_login - Logic Login Form AJAX */
function init_login(){ 
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('loginMessage');
    if (!form) return;

    form.onsubmit = function(e){
        e.preventDefault();
        msg.textContent = 'Authenticating...';
        
        const username = document.getElementById('login_username').value;
        const password = document.getElementById('login_password').value;
        const role = document.getElementById('login_role').value;
        
        fetch('api/auth.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, role})
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                msg.textContent = '';
                alert('Login Berhasil sebagai ' + data.role.toUpperCase() + '!');
                // Setelah login, periksa session dan muat halaman
                checkSessionAndRender(); 
            } else {
                msg.textContent = data.message;
            }
        })
        .catch(err => {
            msg.textContent = 'Error koneksi server. Cek WAMP dan path API.';
            console.error(err);
        });
    };

    // Fungsi demo Buat User Baru (hanya untuk pengujian)
    window.adminAddUserLocal = function(){
        const un = document.getElementById('signup_username').value.trim();
        const role = document.getElementById('signup_role').value;
        if(!un) return alert('⚠️ Isi username');
        const users = storageGet('swims_users')||[];
        if(users.find(x=>x.username===un)) return alert('⚠️ Username sudah ada');
        const id = users.length? Math.max(...users.map(x=>x.id))+1:1;
        // PENTING: Password di sini di-hash di JS karena ini demo, tapi di PHP harus pakai password_hash
        const dummyHash = 'dummy_hash_' + Math.random().toString(36).slice(2, 9);
        users.push({id,username:un,role:r, password: dummyHash}); 
        storageSet('swims_users',users); 
        alert('✅ User demo berhasil dibuat: ' + un); 
        document.getElementById('signup_username').value='';
    };
}


// --- FUNGSI INIT LAINNYA DIHAPUS UNTUK FOKUS REFACTOR LOGIN ---
// Anda harus menambahkan kembali fungsi init_staff, init_supervisor, dll. 
// dan merefactornya agar menggunakan FETCH ke API PHP, bukan localStorage.

// Expose to global scope
window.loadPage = loadPage;
window.renderUserBar = renderUserBar;
window.renderMenu = renderMenu;
window.currentUser = currentUser;
window.init_login = init_login;
window.logout = logout;
window.checkSessionAndRender = checkSessionAndRender;
window.roleLanding = roleLanding;
window.storageGet = storageGet;
window.storageSet = storageSet;