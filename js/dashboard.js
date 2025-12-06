/**
 * =========================================================
 * APP.JS - CORE MODULE (Utilities, Routing, Global State)
 * =========================================================
 */

// ---------- Modal Helpers (TETAP DI SINI) ----------
function showMessageModal(title, message, is_confirm = false, on_confirm = null) {
    // Buat modal element
    let modal = document.getElementById('customModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customModal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content card">
                <h3 id="modalTitle"></h3>
                <p id="modalMessage"></p>
                <div class="modal-actions">
                    <button id="modalCancel" class="btn">Batal</button>
                    <button id="modalConfirm" class="btn primary"></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Tambahkan styling untuk modal (di-inline agar pasti terload)
        const modalStyle = `
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex; /* Default to flex, hidden via JS */
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 400px;
            width: 90%;
        }
        .modal-actions {
            margin-top: 20px;
            text-align: right;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        /* Styling untuk Autocomplete Dropdown - DIBIARKAN DI SINI KARENA DIPAKAI GLOBAL */
        .autocomplete-dropdown {
            position: absolute;
            z-index: 100;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--input-border);
            background: var(--card);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
            width: 100%;
            margin-top: 2px;
            border-radius: 6px;
        }
        .autocomplete-item {
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.9rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .autocomplete-item:hover {
            background: #f1f5f9;
        }
        .autocomplete-item:last-child {
            border-bottom: none;
        }
        .autocomplete-item.disabled {
            cursor: default;
            color: var(--muted);
            font-style: italic;
        }
        `;
        const styleEl = document.createElement('style');
        styleEl.textContent = modalStyle;
        document.head.appendChild(styleEl);
        modal.style.display = 'none'; 
    }
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    if (is_confirm) {
        confirmBtn.style.display = 'inline-block';
        confirmBtn.textContent = 'Ya, Lanjutkan';
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            if (on_confirm) on_confirm();
        };
        cancelBtn.style.display = 'inline-block';
        cancelBtn.onclick = () => modal.style.display = 'none';
    } else {
        confirmBtn.style.display = 'none';
        cancelBtn.textContent = 'Tutup';
        cancelBtn.onclick = () => modal.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function showLoadingModal(message = "Memuat data...") {
    let loading = document.getElementById('loadingModal');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingModal';
        loading.className = 'modal-backdrop';
        loading.innerHTML = `
            <div class="card" style="padding:15px; text-align:center;">
                <p style="margin:0;"><span id="loadingMessage">${message}</span></p>
            </div>
        `;
        document.body.appendChild(loading);
    }
    document.getElementById('loadingMessage').textContent = message;
    loading.style.display = 'flex';
}

function hideLoadingModal() {
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'none';
}


// ---------- Storage helpers (TETAP DI SINI) ----------
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

// Global cache untuk data master (TETAP DI SINI)
let masterDataCache = {
    suppliers: [],
    recipients: [], 
    items: []
};

// ---------- Auth helpers (TETAP DI SINI) ----------

function currentUser(){ 
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
        buttons += `<button onclick="loadPage('request_item')">Request Klien/Supplier</button>`;
    }
    
    if (role === 'supervisor'){
        buttons += `<button onclick="loadPage('supervisor')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('approval')">Approval Transaksi</button>`;
        buttons += `<button onclick="loadPage('approval_items')">Approval Item/Klien</button>`;
        buttons += `<button onclick="loadPage('notes')">Notes</button>`;
    }
    
    if (role === 'admin'){
        buttons += `<button onclick="loadPage('admin')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('admin_users')">User Management</button>`; 
        // TOMBOL MANAGE ITEMS DIHAPUS - BARIS INI SUDAH DIHAPUS
    }
    
    if (role === 'owner'){
        buttons += `<button onclick="loadPage('owner')">Dashboard</button>`;
        buttons += `<button onclick="loadPage('notes')">Notes</button>`;
        buttons += `<button onclick="loadPage('owner_report')">Monitoring & Laporan</button>`;
    }
    
    buttons += `<button style="margin-left:auto" onclick="logout()">Logout</button>`;
    menu.innerHTML = buttons;
}

// Fungsi untuk memeriksa status session di server
async function checkSessionAndRender(){
    try {
        const response = await fetch('api/auth.php?action=check_session');
        const data = await response.json();
        
        if (data.logged_in) {
            storageSet('swims_current_user', data.user); 
            
            renderUserBar();
            renderMenu();
            
            const currentHash = window.location.hash.replace('#', '');
            if (!currentHash || currentHash === 'login') {
                loadPage(roleLanding(data.user.role));
            } else {
                loadPage(currentHash);
            }
        } else {
            storageSet('swims_current_user', null);
            renderUserBar();
            renderMenu();
            loadPage('login');
        }
    } catch (error) {
        console.error('Error checking session:', error);
        storageSet('swims_current_user', null);
        loadPage('login');
    }
}

// Fungsi Logout
function logout(){
    showMessageModal(
        'Konfirmasi Logout', 
        'Apakah Anda yakin ingin keluar dari SWIMS?', 
        true, // is_confirm = true
        async () => {
            try {
                const response = await fetch('api/auth.php?action=logout');
                const data = await response.json();
                if (data.success) {
                    showMessageModal('Berhasil', 'Logout Berhasil.', false);
                    storageSet('swims_current_user', null);
                    checkSessionAndRender(); 
                } else {
                    showMessageModal('Gagal', 'Logout Gagal.', false);
                }
            } catch (error) {
                showMessageModal('Error', 'Error saat logout. Silakan coba lagi.', false);
                console.error('Logout error:', error);
            }
        }
    );
}

// ---------- Page Access Control & Loading (TETAP DI SINI) ----------
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
    'manage_items': ['admin'], 
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
    window.location.hash = page;
    
    fetch(`pages/${page}.php`) 
      .then(r => {
        if (!r.ok) throw new Error(`Halaman pages/${page}.php tidak ditemukan atau akses ditolak (403/404).`);
        return r.text();
      })
      .then(html => {
        document.getElementById('content').innerHTML = html;
        
        // Panggil fungsi init_ jika ada, yang sudah didefinisikan di file modul
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

// ---------- API Master Data Loader (TETAP DI SINI) ----------

async function loadMasterData() {
    showLoadingModal('Mengambil data master (Supplier & Item)...');
    try {
        // FIX: Hapus recipients dari promise.all karena sudah dihapus dari skema
        const [supplierRes, itemRes] = await Promise.all([
            fetch('api/suppliers.php?action=list'),
            fetch('api/items.php?action=available') // Hanya item yang sudah disetujui
        ]);

        const supplierData = await supplierRes.json();
        const itemData = await itemRes.json();

        if (supplierData.success) {
            masterDataCache.suppliers = supplierData.data;
        } else {
            console.error('Gagal memuat supplier:', supplierData.message);
        }
        
        if (itemData.success) {
            masterDataCache.items = itemData.data;
        } else {
            console.error('Gagal memuat item:', itemData.message);
        }

    } catch (error) {
        console.error('Error saat memuat Master Data:', error);
        showMessageModal('Error Jaringan', 'Gagal memuat data master dari server. Pastikan WAMP/XAMPP berjalan.', false);
    } finally {
        hideLoadingModal();
    }
}

// ---------- Expose to global scope (Finalisasi) ----------

window.loadPage = loadPage;
window.renderUserBar = renderUserBar;
window.renderMenu = renderMenu;
window.currentUser = currentUser;
window.logout = logout;
window.checkSessionAndRender = checkSessionAndRender;
window.roleLanding = roleLanding;
window.storageGet = storageGet;
window.storageSet = storageSet;
window.showMessageModal = showMessageModal; 
window.showLoadingModal = showLoadingModal; 
window.hideLoadingModal = hideLoadingModal; 
window.loadMasterData = loadMasterData;

// Log untuk debugging
console.log('SWIMS Core App JS Loaded and ready for modules. ✅');