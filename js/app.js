/*
|--------------------------------------------------------------------------
| APLIKASI LOGIC (JS) - FIXES KRITIS
|--------------------------------------------------------------------------
| 1. Implementasi Opsi "Ajukan Item Baru" (Barang Masuk).
| 2. FIX Bug Item Filtering di Barang Keluar.
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
        /* Styling untuk Autocomplete Dropdown */
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

// Global cache untuk data master
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

// ---------- Helper Functions for Staff Forms (New in Step 4) ----------

/**
 * Helper untuk merender riwayat transaksi Staff (IN/OUT)
 */
async function renderStaffHistory(type, targetDivId) {
    const historyDiv = document.getElementById(targetDivId);
    if (!historyDiv) return;

    historyDiv.innerHTML = '<p>Memuat riwayat...</p>';
    
    try {
        const response = await fetch(`api/transactions.php?action=my_history&type=${type}`);
        const data = await response.json();

        if (!data.success) {
            historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Gagal memuat riwayat: ${data.message}</p>`;
            return;
        }

        if (data.data.length === 0) {
            historyDiv.innerHTML = `<p>Anda belum memiliki riwayat transaksi ${type} terbaru.</p>`;
            return;
        }

        let tableHtml = '<table class="table"><thead><tr>';
        tableHtml += '<th>Kode Trans</th><th>Item (SKU)</th><th>Qty</th><th>Status</th><th>Approver</th><th>Tanggal</th></tr></thead><tbody>';
        
        data.data.forEach(t => {
            let statusBadge;
            if (t.status === 'APPROVED') {
                statusBadge = '<span class="badge badge-success">APPROVED</span>';
            } else if (t.status === 'REJECTED') {
                statusBadge = '<span class="badge badge-danger">REJECTED</span>';
            } else {
                statusBadge = '<span class="badge badge-warning">PENDING</span>';
            }
            
            tableHtml += `
                <tr>
                    <td>${t.transaction_code}</td>
                    <td>${t.item_name} (${t.sku})</td>
                    <td>${t.quantity} ${t.unit}</td>
                    <td>${statusBadge}</td>
                    <td>${t.approver_name ?? '-'}</td>
                    <td>${t.request_date.substring(0, 10)}</td>
                </tr>
            `;
        });

        historyDiv.innerHTML = tableHtml + '</tbody></table>';

    } catch (error) {
        historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">Error saat memuat riwayat: ${error.message}</p>`;
        console.error('Staff history load error:', error);
    }
}

/**
 * Helper untuk mencari item (Autocomplete)
 */
async function autocompleteItem(supplierId, query) {
    if (!supplierId || query.length < 2) return [];

    try {
        const response = await fetch(`api/items.php?action=search&supplier_id=${supplierId}&q=${query}`);
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Autocomplete API failed:', error);
        return [];
    }
}


// ---------- Page init functions (Diintegrasikan dengan API) ----------

/* init_login - Logic Login Form AJAX (Tidak Berubah) */
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
    loadMasterData().then(loadStaffDashboard);
}

// Fungsi untuk memuat statistik dashboard Staff
async function loadStaffDashboard() {
    const statsDiv = document.getElementById('staffStats');
    const user = currentUser();
    
    if (!statsDiv) return;

    // Tambahkan welcome text
    document.getElementById('staffWelcome').innerHTML = `Selamat datang, <b>${user.username}</b>. Gunakan menu untuk mengelola barang.`;
    statsDiv.innerHTML = '';
    showLoadingModal('Mengambil statistik Staff...');

    try {
        const response = await fetch('api/report.php?action=staff_summary');
        const data = await response.json();
        
        if (!data.success) {
            statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat data: ${data.message}</p></div>`;
            return;
        }

        const stats = data.data;

        // Rendering 4 Kartu Statistik
        statsDiv.innerHTML = `
            <div class="stat-box" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="stat-label">Total Jenis Barang (Approved)</div>
                <div class="stat-value">${stats.total_items.toLocaleString()}</div>
            </div>
            <div class="stat-box warn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Masuk</div>
                <div class="stat-value">${stats.pending_in}</div>
            </div>
            <div class="stat-box warn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <div class="stat-label">Pending Keluar</div>
                <div class="stat-value">${stats.pending_out}</div>
            </div>
            <div class="stat-box danger" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                <div class="stat-label">Pending Barang/Klien Baru</div>
                <div class="stat-value">${stats.pending_new_masters}</div>
            </div>
        `;
        
    } catch (error) {
        statsDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error Jaringan: Gagal mengambil data dashboard.</p></div>`;
        console.error('Staff Dashboard load error:', error);
    } finally {
        hideLoadingModal();
    }
}


/* init_barang_masuk - Form Barang Masuk (REVISI TOTAL) */
function init_barang_masuk(){
    const form = document.getElementById('formBarangMasuk');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bm_supplier_id');
    const skuInput = document.getElementById('bm_sku_input');
    const resultsDiv = document.getElementById('autocompleteResults');
    
    let selectedItemId = null;
    let selectedSupplierId = null;

    // Populate Dropdown Supplier
    supplierSelect.innerHTML = '<option value="">-- Pilih Klien Pemilik Barang --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    // Fungsi reset item selection
    const resetItemSelection = (showInput = true) => {
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null;
        document.getElementById('itemInfo').innerHTML = `Status Item: -`;
        resultsDiv.style.display = 'none';
        if (showInput) skuInput.value = '';
    };

    // Fungsi saat item dipilih dari autocomplete
    const selectItem = (item) => {
        skuInput.value = `${item.sku} - ${item.name} (${item.unit})`;
        document.getElementById('bm_item_id').value = item.id;
        selectedItemId = item.id;
        document.getElementById('itemInfo').innerHTML = `Status Item: <b>APPROVED</b> | Unit: ${item.unit} | Stok Saat Ini: ${item.current_stock}`;
        resultsDiv.style.display = 'none';
    };

    // 1. Event Listener untuk perubahan Supplier
    skuInput.disabled = true; 
    skuInput.placeholder = "Pilih Supplier dahulu";
    
    supplierSelect.onchange = function() {
        selectedSupplierId = this.value;
        resetItemSelection();
        skuInput.disabled = !selectedSupplierId; 
        skuInput.placeholder = selectedSupplierId ? "Ketik SKU atau Nama Item..." : "Pilih Supplier dahulu";
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    };
    
    // 2. Event Listener untuk Autocomplete SKU
    skuInput.oninput = async (e) => {
        const query = e.target.value;
        // Reset ID, tapi jangan reset input text
        document.getElementById('bm_item_id').value = '';
        selectedItemId = null; 
        
        resultsDiv.innerHTML = '';
        document.getElementById('itemInfo').innerHTML = `Status Item: Mencari...`;


        if (!selectedSupplierId || query.length < 2) {
             document.getElementById('itemInfo').innerHTML = `Status Item: -`;
             return;
        }

        const results = await autocompleteItem(selectedSupplierId, query);
        
        if (results.length > 0) {
            results.forEach(item => {
                const el = document.createElement('div');
                el.className = 'autocomplete-item';
                el.innerHTML = `<strong>${item.sku}</strong> - ${item.name} (${item.unit}) <span style="float:right; color:var(--muted)">Stok: ${item.current_stock}</span>`;
                el.onclick = () => selectItem(item);
                resultsDiv.appendChild(el);
            });
            resultsDiv.style.display = 'block';
            document.getElementById('itemInfo').innerHTML = `Status Item: **Pilih Item Ditemukan**`;

        } else {
             // LOGIC INPUT BARU (Jika tidak ada hasil, tawarkan opsi ajukan item baru)
             document.getElementById('itemInfo').innerHTML = `
                Status Item: Item tidak ditemukan.<br>
                <button class="btn btn-sm success" onclick="requestNewItem('${query}', event)" style="margin-top:5px;">+ Ajukan Item Baru (${query})</button>
             `;
             resultsDiv.style.display = 'none';
        }
    };
    
    // [LOGIC PENTING] Fungsi Ajukan Item Baru (Sesuai usulan Staff)
    window.requestNewItem = (skuQuery, e) => {
        // Stop event propagation to prevent multiple triggers
        if (e) e.stopPropagation();
        
        const supplierName = supplierSelect.options[supplierSelect.selectedIndex].textContent;
        
        showMessageModal('Ajukan Item Baru?', `Anda akan mengajukan Item Baru dengan SKU: <b>${skuQuery}</b> untuk Klien: <b>${supplierName}</b>. Item akan berstatus PENDING.`, true, async () => {
            showLoadingModal('Mengajukan Item Baru...');

            const payload = {
                sku: skuQuery,
                name: skuQuery, // Default nama sama dengan SKU
                unit: 'Pcs', // Default Unit
                supplier_id: selectedSupplierId,
                current_stock: 0,
            };
            
            try {
                // Gunakan POST ke API Items.php (yang akan membuatnya PENDING karena role=staff)
                const response = await fetch('api/items.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                
                if (data.success) {
                     showMessageModal('✅ Sukses!', `Permintaan Item Baru <b>${skuQuery}</b> berhasil diajukan! Item ini akan aktif setelah Supervisor menyetujuinya.`, false);
                     // Setelah sukses, item baru ini akan memiliki ID di DB, kita bisa reset form
                     form.reset();
                     resetItemSelection();
                } else {
                     showMessageModal('❌ Gagal!', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error Jaringan', 'Gagal mengajukan item baru.', false);
            } finally {
                hideLoadingModal();
            }
        });
    };


    // Tutup dropdown jika klik di luar
    document.addEventListener('click', (e) => {
        if (!skuInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });

    // 3. Event Listener untuk Form Submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        if (!selectedItemId) {
             showMessageModal('Validasi', 'Mohon cari dan pilih Item yang valid dari daftar saran.', false);
             return;
        }

        const payload = {
            type: 'IN',
            item_id: selectedItemId,
            quantity: parseInt(document.getElementById('bm_qty').value),
            note: document.getElementById('bm_note').value,
            supplier_id: selectedSupplierId 
        };
        
        showLoadingModal('Mengajukan Permintaan Barang Masuk...');

        try {
            const response = await fetch('api/transactions.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                resetItemSelection();
                // Muat ulang riwayat
                renderStaffHistory('IN', 'riwayatMasukPanel');
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi. Cek koneksi server Anda.', false);
            console.error('Transaction submit error:', error);
        } finally {
            hideLoadingModal();
        }
    };

    // Muat Riwayat Transaksi Masuk
    renderStaffHistory('IN', 'riwayatMasukPanel');
}


/* init_barang_keluar - Form Barang Keluar (FIX Filter Item) */
function init_barang_keluar(){
    const form = document.getElementById('formBarangKeluar');
    if (!form) return;
    
    const supplierSelect = document.getElementById('bk_supplier_id');
    const itemSelect = document.getElementById('bk_item_id');
    const infoDiv = document.getElementById('itemStockInfo');

    // Populate Dropdown Supplier Filter (termasuk opsi 'Semua')
    supplierSelect.innerHTML = '<option value="">-- Tampilkan Semua Klien --</option>';
    masterDataCache.suppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    
    let allItems = [...masterDataCache.items];
    
    // Fungsi untuk mengisi dropdown Item berdasarkan filter Supplier
    const populateItemDropdown = (supplierId = '') => {
        itemSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
        infoDiv.textContent = 'Stok Saat Ini: -';
        
        // FIX: Filtering dilakukan di frontend menggunakan item.supplier_id
        const filteredItems = allItems.filter(item => {
            // Jika supplierId kosong, tampilkan semua item
            return !supplierId || item.supplier_id == supplierId;
        });

        filteredItems.forEach(item => {
            itemSelect.innerHTML += `<option value="${item.id}" data-stock="${item.current_stock}" data-unit="${item.unit}">${item.sku} - ${item.name} (Stok: ${item.current_stock})</option>`;
        });
        
        document.getElementById('bk_qty').max = null;
    }

    // Fungsi untuk menampilkan info stok saat item dipilih
    const updateStockInfo = () => {
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const stock = selectedOption.getAttribute('data-stock');
            const unit = selectedOption.getAttribute('data-unit');
            
            infoDiv.innerHTML = `Stok Tersedia: <b>${stock} ${unit}</b>`;
            
            document.getElementById('bk_qty').max = stock;
        } else {
            infoDiv.textContent = 'Stok Saat Ini: -';
            document.getElementById('bk_qty').max = null;
        }
    };

    // 1. Event Listener untuk perubahan Supplier (Filtering)
    supplierSelect.onchange = function() {
        populateItemDropdown(this.value);
        updateStockInfo();
    };

    // 2. Event Listener untuk perubahan Item
    itemSelect.onchange = updateStockInfo;
    
    // Muat dropdown item pertama kali (tanpa filter)
    populateItemDropdown(''); 
    
    // 3. Event Listener untuk Form Submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const selectedItemId = document.getElementById('bk_item_id').value;
        const quantity = parseInt(document.getElementById('bk_qty').value);
        const recipientName = document.getElementById('bk_recipient_name').value.trim();
        const recipientAddress = document.getElementById('bk_recipient_address').value.trim();
        const note = document.getElementById('bk_note').value;

        const selectedItemOption = itemSelect.options[itemSelect.selectedIndex];
        const availableStock = selectedItemOption ? parseInt(selectedItemOption.getAttribute('data-stock')) : 0;

        // Validasi Sisi Klien
        if (!selectedItemId || !recipientName || !recipientAddress || quantity <= 0) {
             showMessageModal('Validasi', 'Semua field wajib diisi dengan benar.', false);
             return;
        }
        if (quantity > availableStock) {
             showMessageModal('Validasi Stok', `Jumlah yang diminta (${quantity}) melebihi stok tersedia (${availableStock}).`, false);
             return;
        }
        
        const payload = {
            type: 'OUT',
            item_id: selectedItemId,
            quantity: quantity,
            recipient_name: recipientName,
            recipient_address: recipientAddress,
            note: note
        };
        
        showLoadingModal('Mengajukan Permintaan Barang Keluar...');

        try {
            const response = await fetch('api/transactions.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                showMessageModal('✅ Sukses!', data.message, false);
                form.reset();
                // Muat ulang data master (stok berubah setelah approval) dan riwayat
                loadMasterData().then(() => {
                    populateItemDropdown(supplierSelect.value);
                    updateStockInfo();
                    renderStaffHistory('OUT', 'riwayatKeluarPanel');
                });
            } else {
                showMessageModal('❌ Gagal!', data.message, false);
            }
        } catch (error) {
            showMessageModal('Error Jaringan', 'Gagal terhubung ke API Transaksi. Cek koneksi server Anda.', false);
            console.error('Transaction submit error:', error);
        } finally {
            hideLoadingModal();
        }
    };

    // Muat Riwayat Transaksi Keluar
    renderStaffHistory('OUT', 'riwayatKeluarPanel');
}


/* init_supervisor - Dashboard Supervisor */
function init_supervisor(){
    console.log('Supervisor dashboard loaded.');
}

/* init_admin - Dashboard Admin */
function init_admin(){
    console.log('Admin dashboard loaded.');
}

/* init_owner - Dashboard Owner */
function init_owner(){
    if(typeof loadOwnerDashboard === 'function') {
        loadOwnerDashboard();
    }
}


/* init_approval - Approval Transaksi */
function init_approval(){
    loadApprovalData('transactions');
}

/* init_approval_items - Approval Item/Supplier Baru */
function init_approval_items(){
    const content = document.getElementById('content');
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
    renderItemApprovalContent('items', document.querySelector('#itemApprovalTabs button:first-child'));
}

/**
 * Merender konten spesifik di halaman approval_items.php
 */
function renderItemApprovalContent(type, element) {
    const tabs = document.getElementById('itemApprovalTabs').querySelectorAll('button');
    tabs.forEach(btn => btn.className = 'btn');
    element.className = 'btn primary';

    loadApprovalData(type);
}


/* init_admin_users - User Management */
function init_admin_users(){
    if(typeof loadUserList === 'function') {
        loadUserList();
    }
}

/* init_notes - Notes Page */
function init_notes(){
    if(typeof loadNotesList === 'function') {
        loadNotesList();
    }
}

/* init_owner_report - Owner Report */
function init_owner_report(){
    if(document.getElementById('reportTabs') && typeof renderReport === 'function') {
        document.getElementById('reportTabs').querySelector('button:first-child').className = 'btn primary';
        renderReport('summary');
    }
}

/* init_request_item - Request Item Baru */
function init_request_item(){
    loadMasterData().then(() => {
        if(typeof loadRequestHistory === 'function') {
            loadRequestHistory();
        }
    });
}

/* init_manage_items - Admin Manage Items */
function init_manage_items(){
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
window.loadStaffDashboard = loadStaffDashboard; 
window.renderStaffHistory = renderStaffHistory; 
window.autocompleteItem = autocompleteItem; 
window.renderItemApprovalContent = renderItemApprovalContent;

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

// Log untuk debugging
console.log('SWIMS App JS Loaded and API Ready ✅');