/* app.js - SECURED VERSION: All stock changes need supervisor approval */

// ---------- Storage helpers ----------
function storageGet(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }
function storageSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// ---------- Init default data ----------
function initApp(){
  if (!storageGet('swims_users')){
    const users = [
      {id:1, username:'staff1', role:'staff'},
      {id:2, username:'super1', role:'supervisor'},
      {id:3, username:'admin1', role:'admin'},
      {id:4, username:'owner1', role:'owner'}
    ];
    storageSet('swims_users', users);
  }
  if (!storageGet('swims_items')){
    const items = [
      {id:1, sku:'ITM-001', name:'HandyMeter', total_stock:10},
      {id:2, sku:'ITM-002', name:'Sensor X', total_stock:5}
    ];
    storageSet('swims_items', items);
  }
  if (!storageGet('swims_txns')) storageSet('swims_txns', []);
  if (!storageGet('swims_notes')) storageSet('swims_notes', []);
  if (!storageGet('swims_item_requests')) storageSet('swims_item_requests', []); // NEW: pending item requests
  if (!storageGet('swims_current_user')) storageSet('swims_current_user', null);
}

// ---------- Auth helpers ----------
function storageUsers(){ return storageGet('swims_users') || []; }
function currentUser(){ return storageGet('swims_current_user'); }
function setCurrentUser(u){ storageSet('swims_current_user', u); renderUserBar(); renderMenu(); }

function loginAs(username, role){
  let users = storageUsers();
  let user = users.find(x=>x.username===username && x.role===role);
  if (!user){
    const id = users.length ? Math.max(...users.map(u=>u.id))+1 : 1;
    user = {id, username, role};
    users.push(user);
    storageSet('swims_users', users);
  }
  setCurrentUser({username:user.username, role:user.role, logged_at:new Date().toISOString()});
  loadPage(roleLanding(user.role));
}

function logout(){
  setCurrentUser(null);
  loadPage('login');
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

// ---------- Menu rendering ----------
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

// ---------- Page access control ----------
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

function isAllowed(page, role){
  const allowed = ROLE_ALLOWED_PAGES[page];
  if (!allowed) return false;
  if (!role) role = 'guest';
  return allowed.includes(role) || allowed.includes('guest');
}

function roleLanding(role){
  if (role === 'staff') return 'staff';
  if (role === 'supervisor') return 'supervisor';
  if (role === 'admin') return 'admin';
  if (role === 'owner') return 'owner';
  return 'login';
}

function loadPage(page){
  const user = currentUser();
  const role = user ? user.role : null;
  if (!isAllowed(page, role)){
    const target = role ? roleLanding(role) : 'login';
    alert('⛔ Anda tidak punya akses ke halaman ini.');
    page = target;
  }

  fetch(`pages/${page}.html`)
    .then(r => {
      if (!r.ok) throw new Error('page not found');
      return r.text();
    })
    .then(html => {
      document.getElementById('content').innerHTML = html;
      if (typeof window['init_'+page] === 'function') window['init_'+page]();
    })
    .catch(err => {
      document.getElementById('content').innerHTML = `<div class="card"><h3>Error loading page</h3><pre>${err}</pre></div>`;
    });
}

// ---------- Utils ----------
function newid(prefix='id'){ return prefix + '-' + Math.random().toString(36).slice(2,9); }

// ---------- Page init functions ----------

/* init_login */
function init_login(){ /* nothing special */ }

/* init_staff */
function init_staff(){
  const el = document.getElementById('staffPanel');
  if (el){
    const items = storageGet('swims_items') || [];
    const txns = storageGet('swims_txns') || [];
    const itemReqs = storageGet('swims_item_requests') || [];
    const pendingIn = txns.filter(t=>t.type==='IN' && t.status==='pending').length;
    const pendingOut = txns.filter(t=>t.type==='OUT' && t.status==='pending').length;
    const pendingItems = itemReqs.filter(r=>r.status==='pending').length;
    el.innerHTML = `<div class="card">
      <h2>📊 Staff Dashboard</h2>
      <p>Selamat datang, <b>${currentUser().username}</b>. Gunakan menu untuk mengelola barang.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;">
        <div class="stat-box"><div class="stat-label">Total Jenis Barang</div><div class="stat-value">${items.length}</div></div>
        <div class="stat-box warn"><div class="stat-label">Pending Masuk</div><div class="stat-value">${pendingIn}</div></div>
        <div class="stat-box warn"><div class="stat-label">Pending Keluar</div><div class="stat-value">${pendingOut}</div></div>
        <div class="stat-box warn"><div class="stat-label">Pending Barang Baru</div><div class="stat-value">${pendingItems}</div></div>
      </div>
    </div>`;
  }
}

/* Barang masuk - PERLU APPROVAL */
function init_barang_masuk(){
  const form = document.getElementById('formBarangMasuk');
  const sel = document.getElementById('bm_item');
  const items = storageGet('swims_items') || [];
  sel.innerHTML = items.map(it=>`<option value="${it.id}">${it.sku} — ${it.name} (stok: ${it.total_stock})</option>`).join('');
  form.onsubmit = function(e){
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== 'staff') return alert('⛔ Hanya Staff yang boleh input barang masuk.');
    const itemId = parseInt(sel.value);
    const qty = parseInt(document.getElementById('bm_qty').value) || 0;
    const note = document.getElementById('bm_note').value || '';
    if (qty <= 0) return alert('⚠️ Jumlah harus > 0');
    const txns = storageGet('swims_txns') || [];
    const txn = { 
      id:newid('txn'), 
      txn_number:'TXN-'+Date.now(), 
      type:'IN', 
      created_by:user.username, 
      created_at:new Date().toISOString(), 
      status:'pending',
      items:[{item_id:itemId, qty:qty}], 
      note: note
    };
    txns.push(txn);
    storageSet('swims_txns', txns);
    alert('✅ Request barang masuk tersimpan sebagai PENDING.\nStok akan bertambah setelah Supervisor approve.');
    loadPage('staff');
  }
}

/* Barang keluar - PERLU APPROVAL */
function init_barang_keluar(){
  const form = document.getElementById('formBarangKeluar');
  const sel = document.getElementById('bk_item');
  const items = storageGet('swims_items') || [];
  sel.innerHTML = items.map(it=>`<option value="${it.id}">${it.sku} — ${it.name} (stok: ${it.total_stock})</option>`).join('');
  form.onsubmit = function(e){
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== 'staff') return alert('⛔ Hanya Staff yang boleh request barang keluar.');
    const itemId = parseInt(sel.value);
    const qty = parseInt(document.getElementById('bk_qty').value) || 0;
    if (qty <= 0) return alert('⚠️ Jumlah harus > 0');
    const itemsList = storageGet('swims_items') || [];
    const it = itemsList.find(x=>x.id===itemId);
    if (!it) return alert('❌ Item tidak ditemukan');
    if (qty > it.total_stock) return alert('⚠️ Jumlah melebihi stok yang tersedia!');
    const txns = storageGet('swims_txns') || [];
    const txn = { 
      id:newid('txn'), 
      txn_number:'TXN-'+Date.now(), 
      type:'OUT', 
      created_by:user.username, 
      created_at:new Date().toISOString(), 
      status:'pending', 
      items:[{item_id:itemId, qty:qty}], 
      note:document.getElementById('bk_note').value||''
    };
    txns.push(txn);
    storageSet('swims_txns', txns);
    alert('✅ Request barang keluar tersimpan sebagai PENDING.\nMenunggu approval Supervisor.');
    loadPage('staff');
  }
}

/* Request Item Baru - Staff REQUEST, Supervisor APPROVE */
function init_request_item(){
  const el = document.getElementById('requestItemPanel');
  if (!el) return;
  
  const itemReqs = storageGet('swims_item_requests') || [];
  const myReqs = itemReqs.filter(r=>r.created_by===currentUser().username);
  
  const reqRows = myReqs.length ? myReqs.map(r=>{
    const statusBadge = r.status==='approved' ? '<span class="badge badge-success">approved</span>' : 
                        r.status==='pending' ? '<span class="badge badge-warning">pending</span>' : 
                        '<span class="badge badge-danger">rejected</span>';
    return `<tr>
      <td>${r.sku}</td>
      <td>${r.name}</td>
      <td>${r.initial_stock}</td>
      <td>${statusBadge}</td>
      <td class="small">${new Date(r.created_at).toLocaleString('id-ID')}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" style="text-align:center">Belum ada request</td></tr>';
  
  el.innerHTML = `<div class="card">
    <h2>📦 Request Barang Baru</h2>
    <p class="small">Request akan dikirim ke Supervisor untuk approval. Setelah approved, barang akan masuk ke sistem.</p>
    
    <form id="formRequestItem">
      <label>SKU Barang</label>
      <input id="req_sku" type="text" placeholder="ITM-003" required>
      <label>Nama Barang</label>
      <input id="req_name" type="text" placeholder="Nama produk" required>
      <label>Stok Awal</label>
      <input id="req_stock" type="number" value="0" min="0" required>
      <label>Catatan/Alasan</label>
      <textarea id="req_note" rows="2" placeholder="Opsional: alasan penambahan barang ini..."></textarea>
      <button class="btn primary" type="submit">🚀 Kirim Request</button>
    </form>
    
    <hr>
    <h3>Request Saya</h3>
    <table class="table">
      <thead><tr><th>SKU</th><th>Nama</th><th>Stok Awal</th><th>Status</th><th>Waktu</th></tr></thead>
      <tbody>${reqRows}</tbody>
    </table>
  </div>`;
  
  document.getElementById('formRequestItem').onsubmit = function(e){
    e.preventDefault();
    const user = currentUser();
    const sku = document.getElementById('req_sku').value.trim();
    const name = document.getElementById('req_name').value.trim();
    const stock = parseInt(document.getElementById('req_stock').value) || 0;
    const note = document.getElementById('req_note').value || '';
    
    if (!sku || !name) return alert('⚠️ Isi SKU dan Nama barang');
    
    // Cek duplikat SKU di items & pending requests
    const items = storageGet('swims_items') || [];
    const reqs = storageGet('swims_item_requests') || [];
    if (items.find(x=>x.sku.toLowerCase()===sku.toLowerCase())) return alert('⚠️ SKU sudah ada di sistem!');
    if (reqs.find(x=>x.sku.toLowerCase()===sku.toLowerCase() && x.status==='pending')) return alert('⚠️ SKU sedang dalam proses approval!');
    
    const req = {
      id: newid('itemreq'),
      sku, name, 
      initial_stock: stock,
      note,
      status: 'pending',
      created_by: user.username,
      created_at: new Date().toISOString()
    };
    
    reqs.push(req);
    storageSet('swims_item_requests', reqs);
    alert('✅ Request barang baru berhasil dikirim!\nMenunggu approval dari Supervisor.');
    init_request_item();
  }
}

/* Supervisor dashboard */
function init_supervisor(){
  const el = document.getElementById('supervisorPanel');
  if (el){
    const txns = storageGet('swims_txns') || [];
    const itemReqs = storageGet('swims_item_requests') || [];
    const pendingIn = txns.filter(t=>t.type==='IN' && t.status==='pending').length;
    const pendingOut = txns.filter(t=>t.type==='OUT' && t.status==='pending').length;
    const pendingItems = itemReqs.filter(r=>r.status==='pending').length;
    
    el.innerHTML = `<div class="card">
      <h2>👔 Supervisor Dashboard</h2>
      <p>Gunakan menu untuk melakukan approval transaksi dan barang baru.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;">
        <div class="stat-box warn"><div class="stat-label">Pending Barang Masuk</div><div class="stat-value">${pendingIn}</div></div>
        <div class="stat-box warn"><div class="stat-label">Pending Barang Keluar</div><div class="stat-value">${pendingOut}</div></div>
        <div class="stat-box danger"><div class="stat-label">Pending Barang Baru</div><div class="stat-value">${pendingItems}</div></div>
      </div>
    </div>`;
  }
}

/* Approval Transaksi (IN/OUT) */
function init_approval(){
  const tbl = document.getElementById('approvalList');
  const txns = storageGet('swims_txns') || [];
  const pending = txns.filter(t=>t.status==='pending');
  if (pending.length === 0){
    tbl.innerHTML = '<div class="card"><p>✅ Tidak ada transaksi pending.</p></div>';
    return;
  }
  const rows = pending.map(tx=>{
    const item = storageGet('swims_items').find(i=>i.id===tx.items[0].item_id);
    const typeLabel = tx.type==='IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
    return `<tr>
      <td>${tx.txn_number}</td>
      <td>${typeLabel}</td>
      <td>${tx.created_by}</td>
      <td>${item ? item.name : 'Unknown'}</td>
      <td><b>${tx.items[0].qty}</b></td>
      <td>${tx.note||'-'}</td>
      <td>
        <button class="btn success btn-sm" onclick="approveTxn('${tx.id}')">✓ Approve</button>
        <button class="btn danger btn-sm" onclick="rejectTxn('${tx.id}')">✗ Reject</button>
      </td>
    </tr>`;
  }).join('');
  tbl.innerHTML = `<div class="card">
    <h2>⏳ Approval Transaksi</h2>
    <table class="table">
      <thead><tr><th>Txn</th><th>Type</th><th>By</th><th>Item</th><th>Qty</th><th>Note</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* Approval Barang Baru */
function init_approval_items(){
  const el = document.getElementById('approvalItemsList');
  if (!el) return;
  
  const itemReqs = storageGet('swims_item_requests') || [];
  const pending = itemReqs.filter(r=>r.status==='pending');
  
  if (pending.length === 0){
    el.innerHTML = '<div class="card"><p>✅ Tidak ada request barang baru yang pending.</p></div>';
    return;
  }
  
  const rows = pending.map(r=>`<tr>
    <td>${r.sku}</td>
    <td>${r.name}</td>
    <td>${r.initial_stock}</td>
    <td>${r.created_by}</td>
    <td>${r.note||'-'}</td>
    <td class="small">${new Date(r.created_at).toLocaleString('id-ID')}</td>
    <td>
      <button class="btn success btn-sm" onclick="approveNewItem('${r.id}')">✓ Approve</button>
      <button class="btn danger btn-sm" onclick="rejectNewItem('${r.id}')">✗ Reject</button>
    </td>
  </tr>`).join('');
  
  el.innerHTML = `<div class="card">
    <h2>📦 Approval Barang Baru</h2>
    <p class="small">Review request penambahan barang baru dari Staff.</p>
    <table class="table">
      <thead><tr><th>SKU</th><th>Nama</th><th>Stok Awal</th><th>Requested By</th><th>Note</th><th>Waktu</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* Approve New Item */
function approveNewItem(reqId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('⛔ Hanya Supervisor yang bisa approve.');
  
  let itemReqs = storageGet('swims_item_requests') || [];
  const req = itemReqs.find(r=>r.id===reqId);
  if (!req) return alert('❌ Request tidak ditemukan');
  
  // Tambahkan ke items
  const items = storageGet('swims_items') || [];
  const newId = items.length ? Math.max(...items.map(x=>x.id))+1 : 1;
  items.push({
    id: newId,
    sku: req.sku,
    name: req.name,
    total_stock: req.initial_stock
  });
  storageSet('swims_items', items);
  
  // Update request status
  req.status = 'approved';
  req.approved_by = user.username;
  req.approved_at = new Date().toISOString();
  itemReqs = itemReqs.map(r=> r.id===reqId ? req : r);
  storageSet('swims_item_requests', itemReqs);
  
  alert(`✅ Barang baru "${req.name}" berhasil ditambahkan ke sistem!`);
  init_approval_items();
}

/* Reject New Item */
function rejectNewItem(reqId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('⛔ Hanya Supervisor yang bisa reject.');
  
  let itemReqs = storageGet('swims_item_requests') || [];
  const req = itemReqs.find(r=>r.id===reqId);
  if (!req) return alert('❌ Request tidak ditemukan');
  
  req.status = 'rejected';
  req.rejected_by = user.username;
  req.rejected_at = new Date().toISOString();
  itemReqs = itemReqs.map(r=> r.id===reqId ? req : r);
  storageSet('swims_item_requests', itemReqs);
  
  alert(`❌ Request barang "${req.name}" direject.`);
  init_approval_items();
}

/* Approve Transaction dengan QR */
function approveTxn(txnId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('⛔ Hanya Supervisor yang bisa approve.');
  let txns = storageGet('swims_txns') || [];
  const tx = txns.find(t=>t.id===txnId);
  if (!tx) return alert('❌ Transaksi tidak ditemukan');

  // Update stock
  const items = storageGet('swims_items') || [];
  tx.items.forEach(itm=>{
    const it = items.find(x=>x.id===itm.item_id);
    if (it) {
      if (tx.type === 'IN'){
        it.total_stock = (it.total_stock||0) + itm.qty;
      } else {
        it.total_stock = (it.total_stock||0) - itm.qty;
      }
    }
  });
  storageSet('swims_items', items);

  // Mark approved
  tx.status = 'approved';
  tx.approved_by = user.username;
  tx.approved_at = new Date().toISOString();
  tx.note_id = newid('note');
  txns = txns.map(t=> t.id===txnId ? tx : t);
  storageSet('swims_txns', txns);

  // Create note with QR
  const notes = storageGet('swims_notes') || [];
  const payload = { txn_number: tx.txn_number, type: tx.type, items: tx.items, approved_by: user.username, approved_at: tx.approved_at };
  const signature = btoa(JSON.stringify(payload)).slice(0,64);
  const noteObj = { id: tx.note_id, note_number:'NOTE-'+Date.now(), transaction_id:tx.id, payload, signature, created_by:user.username, created_at:tx.approved_at, qrDataURL: null };

  // Generate QR
  const tmp = document.createElement('div');
  tmp.style.position = 'fixed';
  tmp.style.left = '-9999px';
  document.body.appendChild(tmp);
  const qrText = JSON.stringify({ note_id: noteObj.id, signature: noteObj.signature });
  const qrcode = new QRCode(tmp, { text: qrText, width: 200, height: 200 });
  setTimeout(() => {
    const img = tmp.querySelector('img');
    if (img && img.src){
      noteObj.qrDataURL = img.src;
    } else {
      const canvas = tmp.querySelector('canvas');
      if (canvas) noteObj.qrDataURL = canvas.toDataURL();
      else noteObj.qrDataURL = null;
    }
    document.body.removeChild(tmp);
    notes.push(noteObj);
    storageSet('swims_notes', notes);
    alert('✅ Transaksi approved! Stok telah diupdate.\nNota dengan QR code telah dibuat.');
    loadPage('approval');
  }, 120);
}

/* Reject Transaction */
function rejectTxn(txnId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('⛔ Hanya Supervisor yang bisa reject.');
  let txns = storageGet('swims_txns') || [];
  const tx = txns.find(t=>t.id===txnId);
  if (!tx) return alert('❌ Transaksi tidak ditemukan');
  tx.status = 'rejected';
  tx.rejected_by = user.username;
  tx.rejected_at = new Date().toISOString();
  txns = txns.map(t=> t.id===txnId ? tx : t);
  storageSet('swims_txns', txns);
  alert('❌ Transaksi direject.');
  loadPage('approval');
}

/* Admin Dashboard */
function init_admin(){
  const el = document.getElementById('adminPanel');
  if (!el) return;
  const users = storageUsers();
  const items = storageGet('swims_items') || [];
  const txns = storageGet('swims_txns') || [];
  el.innerHTML = `<div class="card">
    <h2>🔧 Admin Dashboard</h2>
    <p>Admin bertanggung jawab untuk mengelola user sistem.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;">
      <div class="stat-box"><div class="stat-label">Total Users</div><div class="stat-value">${users.length}</div></div>
      <div class="stat-box"><div class="stat-label">Total Barang</div><div class="stat-value">${items.length}</div></div>
      <div class="stat-box"><div class="stat-label">Total Transaksi</div><div class="stat-value">${txns.length}</div></div>
    </div>
  </div>`;
}

/* Admin User Management */
function init_admin_users(){
  const el = document.getElementById('adminUserPanel');
  if (!el) return;
  const users = storageUsers();
  const rows = users.map(u=>`<tr><td>${u.id}</td><td>${u.username}</td><td><span class="role-badge">${u.role}</span></td></tr>`).join('');
  el.innerHTML = `<div class="card">
    <h2>👥 User Management</h2>
    <table class="table">
      <thead><tr><th>ID</th><th>Username</th><th>Role</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr>
    <h3>Tambah User Baru</h3>
    <form id="formAddUser">
      <label>Username</label>
      <input id="new_username" type="text" required>
      <label>Role</label>
      <select id="new_role">
        <option value="staff">staff</option>
        <option value="supervisor">supervisor</option>
        <option value="admin">admin</option>
        <option value="owner">owner</option>
      </select>
      <button class="btn primary" type="submit">Tambah User</button>
    </form>
  </div>`;
  
  document.getElementById('formAddUser').onsubmit = function(e){
    e.preventDefault();
    adminAddUser();
  }
}

function adminAddUser(){
  const un = document.getElementById('new_username').value.trim();
  const role = document.getElementById('new_role').value;
  if (!un) return alert('⚠️ Isi username');
  const users = storageUsers();
  if (users.find(u=>u.username===un)) return alert('⚠️ Username sudah ada');
  const id = users.length ? Math.max(...users.map(u=>u.id))+1 : 1;
  users.push({id, username:un, role});
  storageSet('swims_users', users);
  alert('✅ User berhasil dibuat: '+un);
  init_admin_users();
}

/* Owner Dashboard */
function init_owner(){
  const el = document.getElementById('ownerPanel');
  if (!el) return;
  const items = storageGet('swims_items') || [];
  const txns = storageGet('swims_txns') || [];
  const notes = storageGet('swims_notes') || [];
  el.innerHTML = `<div class="card">
    <h2>👑 Owner Dashboard</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px;">
      <div class="stat-box"><div class="stat-label">Total Jenis Barang</div><div class="stat-value">${items.length}</div></div>
      <div class="stat-box"><div class="stat-label">Total Stok</div><div class="stat-value">${items.reduce((s,i)=>s+i.total_stock,0)}</div></div>
      <div class="stat-box warn"><div class="stat-label">Pending Transactions</div><div class="stat-value">${txns.filter(t=>t.status==='pending').length}</div></div>
      <div class="stat-box success"><div class="stat-label">Approved Transactions</div><div class="stat-value">${txns.filter(t=>t.status==='approved').length}</div></div>
      <div class="stat-box"><div class="stat-label">Notes Issued</div><div class="stat-value">${notes.length}</div></div>
    </div>
  </div>`;
}

/* Owner Report */
function init_owner_report(){
  const el = document.getElementById('ownerReportPanel');
  if (!el) return;
  const txns = storageGet('swims_txns') || [];
  const items = storageGet('swims_items') || [];
  const itemReqs = storageGet('swims_item_requests') || [];
  
  const approved = txns.filter(t=>t.status==='approved');
  const pending = txns.filter(t=>t.status==='pending');
  const rejected = txns.filter(t=>t.status==='rejected');
  
  const txnRows = txns.map(tx=>{
    const item = items.find(i=>i.id===tx.items[0].item_id);
    const statusBadge = tx.status==='approved' ? '<span class="badge badge-success">approved</span>' : 
                        tx.status==='pending' ? '<span class="badge badge-warning">pending</span>' : 
                        '<span class="badge badge-danger">rejected</span>';
    const typeLabel = tx.type==='IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
    return `<tr>
      <td>${tx.txn_number}</td>
      <td>${typeLabel}</td>
      <td>${item ? item.name : 'Unknown'}</td>
      <td><b>${tx.items[0].qty}</b></td>
      <td>${statusBadge}</td>
      <td>${tx.created_by}</td>
      <td class="small">${new Date(tx.created_at).toLocaleString('id-ID')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center">Belum ada transaksi</td></tr>';
  
  const itemRows = items.map(it=>`<tr>
    <td>${it.sku}</td>
    <td>${it.name}</td>
    <td><b>${it.total_stock}</b></td>
  </tr>`).join('');
  
  const reqRows = itemReqs.map(r=>{
    const statusBadge = r.status==='approved' ? '<span class="badge badge-success">approved</span>' : 
                        r.status==='pending' ? '<span class="badge badge-warning">pending</span>' : 
                        '<span class="badge badge-danger">rejected</span>';
    return `<tr>
      <td>${r.sku}</td>
      <td>${r.name}</td>
      <td>${r.created_by}</td>
      <td>${statusBadge}</td>
      <td class="small">${new Date(r.created_at).toLocaleString('id-ID')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center">Belum ada request barang</td></tr>';
  
  el.innerHTML = `<div class="card">
    <h2>📊 Monitoring & Laporan</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="stat-box success"><div class="stat-label">Approved</div><div class="stat-value">${approved.length}</div></div>
      <div class="stat-box warn"><div class="stat-label">Pending</div><div class="stat-value">${pending.length}</div></div>
      <div class="stat-box danger"><div class="stat-label">Rejected</div><div class="stat-value">${rejected.length}</div></div>
    </div>
    
    <h3>📦 Daftar Barang & Stok</h3>
    <table class="table">
      <thead><tr><th>SKU</th><th>Nama</th><th>Stok</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    
    <h3 style="margin-top:24px">🆕 History Request Barang Baru</h3>
    <table class="table">
      <thead><tr><th>SKU</th><th>Nama</th><th>Requested By</th><th>Status</th><th>Waktu</th></tr></thead>
      <tbody>${reqRows}</tbody>
    </table>
    
    <h3 style="margin-top:24px">📋 History Transaksi</h3>
    <table class="table">
      <thead><tr><th>Txn</th><th>Type</th><th>Item</th><th>Qty</th><th>Status</th><th>By</th><th>Waktu</th></tr></thead>
      <tbody>${txnRows}</tbody>
    </table>
  </div>`;
}

/* Notes Page */
function init_notes(){
  const el = document.getElementById('notesList');
  const notes = storageGet('swims_notes') || [];
  if (!notes.length){
    el.innerHTML = '<div class="card"><p>📋 Tidak ada nota yang dikeluarkan.</p></div>';
    return;
  }
  const rows = notes.map(n=>{
    const txns = storageGet('swims_txns') || [];
    const txn = txns.find(t=>t.id===n.transaction_id) || {txn_number:'-', type:'OUT'};
    const typeLabel = txn.type==='IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
    return `<tr>
      <td>${n.note_number}</td>
      <td>${typeLabel}</td>
      <td>${txn.txn_number}</td>
      <td>${n.created_by}</td>
      <td class="small">${new Date(n.created_at).toLocaleString('id-ID')}</td>
      <td>
        ${n.qrDataURL ? `<img src="${n.qrDataURL}" style="width:100px;height:100px;border:1px solid #ddd;border-radius:6px">` : '<span class="small">QR tidak tersedia</span>'}
      </td>
      <td><button class="btn btn-sm" onclick='verifyNote("${n.id}")'>🔍 Verify</button></td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="card">
    <h2>📄 Daftar Nota</h2>
    <p class="small">Nota dikeluarkan otomatis setelah Supervisor approve transaksi. QR code berisi signature untuk verifikasi.</p>
    <table class="table">
      <thead><tr><th>No Nota</th><th>Type</th><th>Txn</th><th>Issued By</th><th>Waktu</th><th>QR Code</th><th>Verifikasi</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* Verify Note */
function verifyNote(noteId){
  const notes = storageGet('swims_notes') || [];
  const n = notes.find(x=>x.id===noteId);
  if (!n) return alert('❌ Nota tidak ditemukan');
  const recomputed = btoa(JSON.stringify(n.payload)).slice(0,64);
  if (recomputed === n.signature){
    alert('✅ VERIFY RESULT: VALID\n\nNota ini asli dan belum dimodifikasi.');
  } else {
    alert('❌ VERIFY RESULT: INVALID\n\nNota ini mungkin palsu atau telah dimodifikasi!');
  }
}

/* Reset System - Hidden function (optional) */
function resetSystem(){
  if (!confirm('⚠️ PERINGATAN: Ini akan menghapus semua data!\nApakah Anda yakin?')) return;
  localStorage.clear();
  initApp();
  renderUserBar();
  renderMenu();
  loadPage('login');
  alert('✅ Sistem berhasil direset!');
}

// Expose to global scope
window.loginAs = loginAs;
window.logout = logout;
window.loadPage = loadPage;
window.initApp = initApp;
window.renderUserBar = renderUserBar;
window.renderMenu = renderMenu;
window.currentUser = currentUser;
window.storageGet = storageGet;
window.storageSet = storageSet;
window.resetSystem = resetSystem; // Hidden, only for emergency
window.adminAddUser = adminAddUser;
window.approveTxn = approveTxn;
window.rejectTxn = rejectTxn;
window.approveNewItem = approveNewItem;
window.rejectNewItem = rejectNewItem;
window.verifyNote = verifyNote;

// Init functions
window.init_login = init_login;
window.init_staff = init_staff;
window.init_barang_masuk = init_barang_masuk;
window.init_barang_keluar = init_barang_keluar;
window.init_request_item = init_request_item;
window.init_supervisor = init_supervisor;
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.init_admin = init_admin;
window.init_admin_users = init_admin_users;
window.init_owner = init_owner;
window.init_owner_report = init_owner_report;
window.init_notes = init_notes;