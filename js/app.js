/**
 * =========================================================
 * APP.JS - CORE MODULE v3.0 - SIDEBAR LAYOUT
 * Sidebar Navigation with Dynamic Role Colors
 * =========================================================
 */

// ========================================
// ROLE COLOR MAPPING
// ========================================
const ROLE_COLORS = {
    'admin': '#D96236',      // Burnt Orange
    'owner': '#1F456F',      // Deep Indigo
    'supervisor': '#447C4F', // Cypress Green
    'staff': '#7D447D'       // Deep Plum
};

// ========================================
// ROLE ICON MAPPING
// ========================================
const ROLE_ICONS = {
    'admin': '👨‍💼',
    'owner': '👑',
    'supervisor': '👨‍✈️',
    'staff': '👨‍🔧'
};

// ========================================
// MENU STRUCTURE PER ROLE
// ========================================
const ROLE_MENUS = {
    'staff': [
        { section: 'Main', items: [
            { icon: '', label: 'Dashboard', page: 'staff' },
            { icon: '', label: 'Inventaris Stok', page: 'inventory' }
        ]},
        { section: 'Transaksi', items: [
            { icon: '', label: 'Barang Masuk', page: 'barang_masuk' },
            { icon: '', label: 'Barang Keluar', page: 'barang_keluar' }
        ]},
        { section: 'Request', items: [
            { icon: '', label: 'Request Klien/Supplier', page: 'request_item' }
        ]}
    ],
    'supervisor': [
        { section: 'Main', items: [
            { icon: '', label: 'Dashboard', page: 'supervisor' },
            { icon: '', label: 'Inventaris Stok', page: 'inventory' }
        ]},
        { section: 'Approval', items: [
            { icon: '', label: 'Approval Transaksi', page: 'approval' },
            { icon: '', label: 'Approval Supplier/Klien', page: 'approval_items' }
        ]},
        { section: 'Monitoring', items: [
            { icon: '', label: 'History Transaksi', page: 'history_transaksi' },
            { icon: '', label: 'Notes Internal', page: 'notes' }
        ]}
    ],
    'admin': [
        { section: 'Main', items: [
            { icon: '', label: 'Dashboard', page: 'admin' },
            { icon: '', label: 'Inventaris Stok', page: 'inventory' }
        ]},
        { section: 'Management', items: [
            { icon: '', label: 'User Management', page: 'admin_users' },
            { icon: '', label: 'Activity Logs', page: 'admin_activity_logs' }
        ]}
    ],
    'owner': [
        { section: 'Main', items: [
            { icon: '', label: 'Dashboard', page: 'owner' },
            { icon: '', label: 'Inventaris Stok', page: 'inventory' }
        ]},
        { section: 'Reports', items: [
            { icon: '', label: 'Monitoring & Laporan', page: 'owner_report' },
            { icon: '', label: 'History Transaksi', page: 'history_transaksi' }
        ]},
        { section: 'Communication', items: [
            { icon: '', label: 'Notes Internal', page: 'notes' }
        ]}
    ]
};

// ---------- Modal Helpers ----------
function showMessageModal(title, message, is_confirm = false, on_confirm = null) {
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
            <div class="card" style="padding:20px; text-align:center;">
                <div class="loading-spinner"></div>
                <p style="margin:10px 0 0 0;"><span id="loadingMessage">${message}</span></p>
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

// ---------- Storage helpers ----------
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

// Global cache
let masterDataCache = {
    suppliers: [],
    recipients: [], 
    items: []
};

// ---------- Auth helpers ----------
function currentUser(){ 
    return storageGet('swims_current_user'); 
}

// ========================================
// SET ROLE COLOR (Dynamic CSS Variable)
// ========================================
function setRoleColor(role) {
    const color = ROLE_COLORS[role] || ROLE_COLORS['admin'];
    document.documentElement.style.setProperty('--current-role-color', color);
    console.log(`✅ Role color set to: ${color} (${role})`);
}

// ========================================
// RENDER SIDEBAR USER INFO
// ========================================
function renderSidebarUser() {
    const container = document.getElementById('sidebarUser');
    const user = currentUser();
    
    if (!user) {
        container.innerHTML = '<p class="small" style="text-align:center; color:var(--text-muted);">Not logged in</p>';
        return;
    }
    
    const icon = ROLE_ICONS[user.role] || '👤';
    const initials = user.username.substring(0, 2).toUpperCase();
    
    container.innerHTML = `
        <div class="user-info">
            <div class="user-avatar" title="${user.username}">
                ${icon}
            </div>
            <div class="user-details">
                <div class="user-name">${user.username}</div>
                <span class="user-role">${user.role}</span>
            </div>
        </div>
    `;
}

// ========================================
// RENDER SIDEBAR NAVIGATION
// ========================================
function renderSidebarNav() {
    const container = document.getElementById('sidebarNav');
    const user = currentUser();
    
    if (!user) {
        container.innerHTML = '<p class="small" style="padding:20px; text-align:center;">Please login</p>';
        return;
    }
    
    const menuStructure = ROLE_MENUS[user.role] || [];
    
    let html = '';
    
    menuStructure.forEach(section => {
        if (section.section) {
            html += `<div class="nav-section-title">${section.section}</div>`;
        }
        
        section.items.forEach(item => {
            html += `
                <a class="nav-item" onclick="loadPage('${item.page}')" data-page="${item.page}">
                    <span class="nav-item-icon">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        });
    });
    
    container.innerHTML = html;
    
    // Set active state
    updateActiveNavItem();
}

// ========================================
// UPDATE ACTIVE NAV ITEM
// ========================================
function updateActiveNavItem() {
    const currentHash = window.location.hash.replace('#', '');
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === currentHash) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ========================================
// UPDATE PAGE TITLE & BREADCRUMB
// ========================================
function updatePageHeader(page) {
    const pageTitles = {
        'staff': 'Staff Dashboard',
        'barang_masuk': 'Barang Masuk',
        'barang_keluar': 'Barang Keluar',
        'request_item': 'Request Klien/Supplier',
        'inventory': 'Inventaris Stok Gudang',
        'supervisor': 'Supervisor Dashboard',
        'approval': 'Approval Transaksi',
        'approval_items': 'Approval Supplier/Klien',
        'history_transaksi': 'History Transaksi',
        'notes': 'Notes Internal',
        'admin': 'Admin Dashboard',
        'admin_users': 'User Management',
        'admin_activity_logs': 'Activity Logs',
        'owner': 'Owner Dashboard',
        'owner_report': 'Monitoring & Laporan',
        'login': 'Login'
    };
    
    const title = pageTitles[page] || 'SWIMS';
    document.getElementById('pageTitle').textContent = title;
    
    const user = currentUser();
    const breadcrumb = user ? `${user.role.toUpperCase()} > ${title}` : title;
    document.getElementById('breadcrumb').textContent = breadcrumb;
}

// ========================================
// CHECK SESSION AND RENDER
// ========================================
async function checkSessionAndRender(){
    try {
        const response = await fetch('api/auth.php?action=check_session');
        const data = await response.json();
        
        if (data.logged_in) {
            storageSet('swims_current_user', data.user); 
            
            // Set role color
            setRoleColor(data.user.role);
            
            // Render sidebar
            renderSidebarUser();
            renderSidebarNav();
            
            // Load page
            const currentHash = window.location.hash.replace('#', '');
            if (!currentHash || currentHash === 'login') {
                loadPage(roleLanding(data.user.role));
            } else {
                loadPage(currentHash);
            }
        } else {
            storageSet('swims_current_user', null);
            hideSidebar();
            loadPage('login');
        }
    } catch (error) {
        console.error('Error checking session:', error);
        storageSet('swims_current_user', null);
        hideSidebar();
        loadPage('login');
    }
}

// ========================================
// HIDE SIDEBAR (FOR LOGIN PAGE)
// ========================================
function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.marginLeft = '0';
}

function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.marginLeft = 'var(--sidebar-width)';
}

// ========================================
// LOGOUT
// ========================================
function logout(){
    showMessageModal(
        'Konfirmasi Logout', 
        'Apakah Anda yakin ingin keluar dari SWIMS?', 
        true,
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

// ========================================
// LOAD PAGE
// ========================================
function loadPage(page){
    window.location.hash = page;
    
    console.log(`📄 Loading page: ${page}`);
    
    // HIDE LOADING MODAL SEBELUM PROSES PAGE CHANGE
    hideLoadingModal(); 

    // Update header (will be handled by checkSessionAndRender on hash change if needed)
    updatePageHeader(page);
    
    // Update active nav
    updateActiveNavItem();
    
    const contentHeader = document.getElementById('contentHeader');

    // Show/hide sidebar and content header based on page
    if (page === 'login') {
        hideSidebar();
        if (contentHeader) contentHeader.style.display = 'none';
    } else {
        showSidebar();
        if (contentHeader) contentHeader.style.display = 'block'; // Ensure header is shown after login
    }
    
    fetch(`pages/${page}.php`) 
      .then(r => {
        if (!r.ok) throw new Error(`Halaman pages/${page}.php tidak ditemukan atau akses ditolak (403/404).`);
        return r.text();
      })
      .then(html => {
        document.getElementById('content').innerHTML = html;
        
        console.log(`✅ Page HTML loaded: ${page}`);
        
        // Minimal delay untuk memastikan DOM ter-render sebelum memanggil init function
        setTimeout(() => {
            const initFuncName = 'init_' + page;
            console.log(`🔍 Looking for ${initFuncName} function...`);
            
            if (typeof window[initFuncName] === 'function') {
                console.log(`✅ Calling ${initFuncName}...`);
                window[initFuncName]();
            } else {
                console.log(`ℹ️ No ${initFuncName} function`);
            }
        }, 100);
      })
      .catch(err => {
        console.error('❌ Page load error:', err);
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

// ========================================
// LOAD MASTER DATA
// ========================================
async function loadMasterData() {
    showLoadingModal('Mengambil data master (Supplier & Item)...');
    try {
        const [supplierRes, itemRes] = await Promise.all([
            fetch('api/suppliers.php?action=list'),
            fetch('api/items.php?action=available')
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

// ========================================
// ROLE LANDING PAGE
// ========================================
function roleLanding(role){
    if (role === 'staff') return 'staff';
    if (role === 'supervisor') return 'supervisor';
    if (role === 'admin') return 'admin';
    if (role === 'owner') return 'owner';
    return 'login';
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.loadPage = loadPage;
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
window.setRoleColor = setRoleColor;
window.renderSidebarUser = renderSidebarUser;
window.renderSidebarNav = renderSidebarNav;
window.setRoleColor = setRoleColor;
window.renderSidebarUser = renderSidebarUser;
window.renderSidebarNav = renderSidebarNav;
window.ROLE_COLORS = ROLE_COLORS; // EXPOSE ROLE COLORS

console.log('✅ SWIMS Core App JS v3.1 Loaded (FIXED)');