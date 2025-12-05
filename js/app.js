/*
|--------------------------------------------------------------------------
| APLIKASI LOGIC (JS) - MIGRASI TOTAL KE API PHP (CRUD Lengkap)
|--------------------------------------------------------------------------
| Mengintegrasikan API Auth, Suppliers, Recipients, Items, Transactions, dan Approval.
*/

// ---------- DOM & UI Helpers ----------

// Mengganti alert/confirm dengan modal custom (Wajib untuk Immersive)
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
        `;
        const styleEl = document.createElement('style');
        styleEl.textContent = modalStyle;
        document.head.appendChild(styleEl);
        modal.style.display = 'none'; // Sembunyikan secara default setelah styling dimuat
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
    // Implementasi Loading modal sederhana
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


// ---------- Storage helpers (Cache lokal untuk data master) ----------
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

// Global cache untuk data master agar tidak sering fetch
let masterDataCache = {
    suppliers: [],
    recipients: [],
    items: []
};

// ---------- Auth helpers ----------

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
    // Logika menu tetap sama
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
        buttons += `<button onclick="loadPage('request_item')">Request Barang/Klien</button>`;
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
        buttons += `<button onclick="loadPage('manage_items')">Manage Item</button>`; 
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

// ---------- Page Access Control & Loading ----------
const ROLE_ALLOWED_PAGES = {
    // ... (tetap sama)
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

// ---------- API Master Data Loader ----------

async function loadMasterData() {
    showLoadingModal('Mengambil data master (Supplier & Item)...');
    try {
        const [supplierRes, recipientRes, itemRes] = await Promise.all([
            fetch('api/suppliers.php?action=list'),
            fetch('api/recipients.php'),
            fetch('api/items.php?action=available') // Hanya item yang sudah disetujui
        ]);

        const supplierData = await supplierRes.json();
        const recipientData = await recipientRes.json();
        const itemData = await itemRes.json();

        if (supplierData.success) {
            masterDataCache.suppliers = supplierData.data;
        } else {
            console.error('Gagal memuat supplier:', supplierData.message);
        }
        
        if (recipientData.success) {
            masterDataCache.recipients = recipientData.data;
        } else {
            console.error('Gagal memuat penerima:', recipientData.message);
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


// ---------- Page init functions (Diintegrasikan dengan API) ----------

/* init_login - Logic Login Form AJAX (Tidak Berubah) */
function init_login(){ 
    // Logika ini tetap sama, memanggil api/auth.php POST
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
                msg.textContent = '✅ Login berhasil! Redirecting...';
                msg.style.color = '#16a34a';
                
                storageSet('swims_current_user', { username: username, role: data.role });
                
                renderUserBar();
                renderMenu();
                
                setTimeout(() => {
                    loadPage(roleLanding(data.role));
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
    // Memuat data master saat Staff dashboard dimuat
    loadMasterData();
    console.log('Staff dashboard loaded, master data cached.');
    // TODO: Tambahkan fetch untuk statistik dashboard di sini
}

/* init_supervisor - Dashboard Supervisor */
function init_supervisor(){
    // TODO: Tambahkan fetch untuk statistik dashboard Supervisor di sini
    console.log('Supervisor dashboard loaded.');
}

/* init_admin - Dashboard Admin */
function init_admin(){
    // TODO: Tambahkan fetch untuk statistik dashboard Admin di sini
    console.log('Admin dashboard loaded.');
}

/* init_owner - Dashboard Owner */
function init_owner(){
    // TODO: Tambahkan fetch untuk statistik dashboard Owner di sini
    console.log('Owner dashboard loaded.');
}

/**
 * Helper untuk form submission transaksi (IN/OUT)
 * @param {string} type 'IN' atau 'OUT'
 * @param {HTMLFormElement} form Element form yang disubmit
 * @param {string} masterSelectId ID dari select Item
 * @param {string} masterIdSelectId ID dari select Supplier/Recipient
 */
async function handleTransactionSubmit(type, form, itemSelectId, masterIdSelectId) {
    const item_id = document.getElementById(itemSelectId).value;
    const quantity = parseInt(document.getElementById(type === 'IN' ? 'bm_qty' : 'bk_qty').value);
    const note = document.getElementById(type === 'IN' ? 'bm_note' : 'bk_note').value;
    const master_id = document.getElementById(masterIdSelectId).value;

    if (!item_id || !master_id || quantity <= 0) {
        showMessageModal('Validasi Gagal', 'Semua field Item, Supplier/Penerima, dan Jumlah harus diisi dengan benar.', false);
        return;
    }
    
    showLoadingModal(`Mengajukan Permintaan ${type}...`);

    try {
        const response = await fetch('api/transactions.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: type,
                item_id: item_id,
                quantity: quantity,
                note: note,
                master_id: master_id
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showMessageModal('✅ Sukses!', data.message + `<br>Kode Transaksi: <b>${data.data.code}</b>`, false);
            form.reset();
            // Muat ulang master data untuk update stok di form Barang Keluar
            if (type === 'OUT') {
                loadMasterData();
            }
        } else {
            showMessageModal('❌ Gagal!', data.message, false);
        }
    } catch (error) {
        showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi.', false);
        console.error('Transaction submit error:', error);
    } finally {
        hideLoadingModal();
    }
}


/* init_barang_masuk - Form Barang Masuk */
function init_barang_masuk(){
    const form = document.getElementById('formBarangMasuk');
    if (!form) return;
    
    const itemSelect = document.getElementById('bm_item');
    
    // Pastikan elemen select untuk Supplier sudah ada (atau buat)
    let supplierSelect = document.getElementById('bm_supplier_id');
    if (!supplierSelect) {
        supplierSelect = document.createElement('select');
        supplierSelect.id = 'bm_supplier_id';
        supplierSelect.required = true;

        // Cari label untuk bm_item dan sisipkan elemen Supplier di atasnya
        const itemLabel = form.querySelector('label[for="bm_item"]');
        if (itemLabel) {
            itemLabel.before(supplierSelect);
            const labelEl = document.createElement('label');
            labelEl.textContent = 'Pilih Supplier (Klien)';
            supplierSelect.before(labelEl);
        }
    }
    
    // Isi Dropdown Item dan Supplier
    itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
    supplierSelect.innerHTML = '<option value="">-- Pilih Supplier --</option>';

    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    masterDataCache.items.forEach(i => {
        itemSelect.innerHTML += `<option value="${i.id}">${i.sku} - ${i.name} (${i.unit})</option>`;
    });

    form.onsubmit = function(e){
        e.preventDefault();
        handleTransactionSubmit('IN', form, 'bm_item', 'bm_supplier_id');
    };
}

/* init_barang_keluar - Form Barang Keluar */
function init_barang_keluar(){
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    const itemSelect = document.getElementById('bk_item');

    // Pastikan elemen select untuk Penerima sudah ada (atau buat)
    let recipientSelect = document.getElementById('bk_recipient_id'); 
    if (!recipientSelect) {
        recipientSelect = document.createElement('select');
        recipientSelect.id = 'bk_recipient_id';
        recipientSelect.required = true;

        // Cari label untuk bk_item dan sisipkan elemen Penerima di atasnya
        const itemLabel = form.querySelector('label[for="bk_item"]');
        if (itemLabel) {
            itemLabel.before(recipientSelect);
            const labelEl = document.createElement('label');
            labelEl.textContent = 'Pilih Penerima';
            recipientSelect.before(labelEl);
        }
    }
    
    // Isi Dropdown Item dan Penerima
    itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
    recipientSelect.innerHTML = '<option value="">-- Pilih Penerima --</option>';

    masterDataCache.recipients.forEach(r => {
        recipientSelect.innerHTML += `<option value="${r.id}">${r.name} (${r.type})</option>`;
    });

    masterDataCache.items.forEach(i => {
        itemSelect.innerHTML += `<option value="${i.id}">${i.sku} - ${i.name} (Stok: ${i.current_stock})</option>`;
    });
    
    form.onsubmit = function(e){
        e.preventDefault();
        handleTransactionSubmit('OUT', form, 'bk_item', 'bk_recipient_id');
    };
}


/**
 * Mengambil data pending dan merender tabel di halaman Approval.
 * @param {string} action 'transactions', 'items', atau 'suppliers'
 */
async function loadApprovalData(action) {
    // Tentukan ID div target
    const listDiv = document.getElementById(
        action === 'transactions' ? 'approvalList' : 'approvalItemsList'
    );
    if (!listDiv) return;

    listDiv.innerHTML = '<div class="card"><p>Memuat data...</p></div>';
    showLoadingModal('Mengambil daftar PENDING...');

    try {
        const response = await fetch(`api/approval.php?action=${action}`);
        const data = await response.json();
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        if (data.data.length === 0) {
            listDiv.innerHTML = '<div class="card"><h3 style="color:var(--success);">✅ Tidak ada permintaan PENDING saat ini.</h3></div>';
            return;
        }

        let tableHtml = '<div class="card"><h2>Daftar Permintaan PENDING</h2><table class="table"><thead><tr>';
        
        if (action === 'transactions') {
            // Header untuk Approval Transaksi
            tableHtml += '<th>ID</th><th>Tipe</th><th>Item (SKU)</th><th>Kuantitas</th><th>Klien/Penerima</th><th>Requester</th><th>Aksi</th>';
            tableHtml += '</tr></thead><tbody>';
            data.data.forEach(t => {
                const badgeClass = t.type === 'IN' ? 'badge-in' : 'badge-out';
                const masterName = t.type === 'IN' ? t.supplier_name : t.recipient_name;
                
                tableHtml += `
                    <tr>
                        <td>${t.transaction_code}</td>
                        <td><span class="badge ${badgeClass}">${t.type}</span></td>
                        <td>${t.item_name} (${t.sku})</td>
                        <td>${t.quantity} ${t.unit}</td>
                        <td>${masterName}</td>
                        <td>${t.requester_name}</td>
                        <td>
                            <button class="btn success btn-sm" onclick="handleApprovalAction('approve_transaction', ${t.id}, 'transactions')">Approve</button>
                            <button class="btn danger btn-sm" onclick="handleApprovalAction('reject_transaction', ${t.id}, 'transactions')">Reject</button>
                        </td>
                    </tr>
                `;
            });
        } else if (action === 'items') {
             // Header untuk Approval Item Baru
            tableHtml += '<th>ID</th><th>Item (SKU)</th><th>Klien Pemilik</th><th>Unit</th><th>Diajukan Oleh</th><th>Aksi</th>';
            tableHtml += '</tr></thead><tbody>';
            data.data.forEach(i => {
                 tableHtml += `
                    <tr>
                        <td>${i.id}</td>
                        <td>${i.name} (${i.sku})</td>
                        <td>${i.supplier_name}</td>
                        <td>${i.unit}</td>
                        <td>${i.requester_name}</td>
                        <td>
                            <button class="btn success btn-sm" onclick="handleApprovalAction('approve_item', ${i.id}, 'items')">Setujui Item</button>
                        </td>
                    </tr>
                `;
            });
        } else if (action === 'suppliers') {
            // Header untuk Approval Supplier Baru
            tableHtml += '<th>ID</th><th>Nama Klien/PT</th><th>Kontak Person</th><th>Telepon</th><th>Diajukan Oleh</th><th>Aksi</th>';
            tableHtml += '</tr></thead><tbody>';
            data.data.forEach(s => {
                 tableHtml += `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.name}</td>
                        <td>${s.contact_person ?? '-'}</td>
                        <td>${s.phone ?? '-'}</td>
                        <td>${s.requester_name}</td>
                        <td>
                            <button class="btn success btn-sm" onclick="handleApprovalAction('approve_supplier', ${s.id}, 'suppliers')">Setujui Klien</button>
                        </td>
                    </tr>
                `;
            });
        }

        tableHtml += '</tbody></table></div>';
        listDiv.innerHTML = tableHtml;

    } catch (error) {
        listDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error saat memuat data: ${error.message}</p></div>`;
        console.error('Approval load error:', error);
    } finally {
        hideLoadingModal();
    }
}

/**
 * Mengirim aksi Approval ke API
 * @param {string} action 'approve_transaction', 'reject_transaction', 'approve_item', atau 'approve_supplier'
 * @param {number} id ID Transaksi, Item, atau Supplier
 * @param {string} typeOfList Tipe daftar yang perlu dimuat ulang ('transactions', 'items', 'suppliers')
 */
function handleApprovalAction(action, id, typeOfList) {
    let confirmationMessage;
    if (action === 'approve_transaction') {
        confirmationMessage = 'Apakah Anda yakin ingin MENYETUJUI transaksi ini? Stok akan berubah secara permanen.';
    } else if (action === 'reject_transaction') {
        confirmationMessage = 'Apakah Anda yakin ingin MENOLAK transaksi ini? Status akan berubah menjadi REJECTED.';
    } else if (action === 'approve_item') {
        confirmationMessage = 'Apakah Anda yakin ingin MENYETUJUI Item baru ini? Item akan aktif untuk transaksi IN/OUT.';
    } else if (action === 'approve_supplier') {
        confirmationMessage = 'Apakah Anda yakin ingin MENYETUJUI Klien/Supplier baru ini? Klien akan aktif dan bisa digunakan.';
    }

    showMessageModal('Konfirmasi Aksi', confirmationMessage, true, async () => {
        showLoadingModal('Memproses aksi...');
        try {
            const response = await fetch('api/approval.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: action, id: id })
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                // Muat ulang data setelah sukses
                if (typeOfList === 'suppliers' || typeOfList === 'items') {
                    // Karena approval items dan suppliers ada di halaman yang sama, muat ulang keduanya.
                    loadMasterData(); // Muat ulang master data untuk update dropdown
                    renderItemApprovalContent(typeOfList, document.querySelector(`#itemApprovalTabs button[onclick*="'${typeOfList}'"]`));
                } else {
                    loadApprovalData(typeOfList);
                }
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Approval.', false);
            console.error('Approval action error:', error);
        } finally {
            hideLoadingModal();
        }
    });
}


/* init_approval - Approval Transaksi */
function init_approval(){
    loadApprovalData('transactions');
}

/**
 * Helper untuk memuat kedua daftar approval (Item dan Supplier) di halaman approval_items.php
 */
function loadApprovalItemsPage() {
    loadApprovalData('items'); // Memuat Item Baru
    loadApprovalData('suppliers'); // Memuat Supplier Baru
}

/* init_approval_items - Approval Item/Supplier Baru */
function init_approval_items(){
    // Tambahkan tab navigasi ke halaman approval_items.php
    const content = document.getElementById('content');
    
    // Periksa apakah halaman sudah di-override (untuk mencegah double render)
    if (!document.getElementById('itemApprovalTabs')) {
         content.innerHTML = `
            <div class="card">
                <h2>✅ Approval Item & Klien Baru</h2>
                <p class="small">Supervisor menyetujui Item dan Klien yang diajukan Staff agar dapat digunakan dalam transaksi.</p>
            </div>
            <div class="menu" id="itemApprovalTabs">
                <button class="btn primary" onclick="renderItemApprovalContent('items', this)">Permintaan Item Baru</button>
                <button class="btn" onclick="renderItemApprovalContent('suppliers', this)">Permintaan Klien/Supplier Baru</button>
            </div>
            <div id="approvalItemsList"></div>
        `;
    }

    // Render konten awal
    renderItemApprovalContent('items', document.querySelector('#itemApprovalTabs button:first-child'));
}

/**
 * Merender konten spesifik di halaman approval_items.php
 */
function renderItemApprovalContent(type, element) {
    const tabs = document.getElementById('itemApprovalTabs').querySelectorAll('button');
    tabs.forEach(btn => btn.className = 'btn');
    element.className = 'btn primary';

    // Panggil fungsi pemuatan data dengan tipe yang diminta
    loadApprovalData(type);
}


/* init_admin_users - User Management */
function init_admin_users(){
    // Logika CRUD user sudah ada di pages/admin_users.php script
    // Fungsi loadUserList (di dalam pages/admin_users.php) akan dipanggil
    if(typeof loadUserList === 'function') {
        loadUserList();
    }
}

/* init_notes - Notes Page */
function init_notes(){
    console.log('Notes page loaded');
    // TODO: Implementasi CRUD Notes
}

/* init_owner_report - Owner Report */
function init_owner_report(){
    // Logika Laporan sudah ada di pages/owner_report.php script
    // Memastikan tab summary aktif saat dimuat
    if(document.getElementById('reportTabs')) {
        document.getElementById('reportTabs').querySelector('button:first-child').className = 'btn primary';
        if(typeof renderReport === 'function') {
            renderReport('summary');
        }
    }
}

/* init_request_item - Request Item Baru */
function init_request_item(){
    // Logika request item sudah ada di pages/request_item.php script
    loadMasterData().then(() => {
        // Tampilkan form Item Baru secara default
        if(typeof showRequestForm === 'function') {
            showRequestForm('item', document.querySelector('#requestTabs button:first-child'));
        }
    });
}

/* init_manage_items - Admin Manage Items */
function init_manage_items(){
    // Logika CRUD Item sudah ada di pages/manage_items.php script
    // Fungsi loadItemList (di dalam pages/manage_items.php) akan dipanggil
    if(typeof loadItemList === 'function') {
        loadItemList();
    }
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
window.showMessageModal = showMessageModal; 
window.handleApprovalAction = handleApprovalAction;
window.loadMasterData = loadMasterData;

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
window.init_manage_items = init_manage_items;
window.loadApprovalItemsPage = loadApprovalItemsPage;
window.renderItemApprovalContent = renderItemApprovalContent;

// Log untuk debugging
console.log('SWIMS App JS Loaded and API Ready ✅');