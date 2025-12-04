/* app.js - demo client-side with approval + QR notes + verification */

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
    menu.innerHTML = `<button class="btn" onclick="loadPage('login')">Login</button>`;
    return;
  }
  const role = user.role;
  let buttons = '';
  if (role === 'staff'){
    buttons += `<button class="btn" onclick="loadPage('staff')">Staff</button>`;
    buttons += `<button class="btn" onclick="loadPage('barang_masuk')">Barang Masuk</button>`;
    buttons += `<button class="btn" onclick="loadPage('barang_keluar')">Barang Keluar</button>`;
  }
  if (role === 'supervisor'){
    buttons += `<button class="btn" onclick="loadPage('supervisor')">Supervisor</button>`;
    buttons += `<button class="btn" onclick="loadPage('approval')">Approval</button>`;
    buttons += `<button class="btn" onclick="loadPage('notes')">Notes</button>`;
  }
  if (role === 'admin'){
    buttons += `<button class="btn" onclick="loadPage('admin')">Admin</button>`;
    buttons += `<button class="btn" onclick="loadPage('admin_users')">User Management</button>`;
  }
  if (role === 'owner'){
    buttons += `<button class="btn" onclick="loadPage('owner')">Owner</button>`;
    buttons += `<button class="btn" onclick="loadPage('notes')">Notes</button>`;
    buttons += `<button class="btn" onclick="loadPage('owner_report')">Monitoring</button>`;
  }
  buttons += `<button class="btn" style="margin-left:auto" onclick="logout()">Logout</button>`;
  menu.innerHTML = buttons;
}

// ---------- Page access control ----------
const ROLE_ALLOWED_PAGES = {
  'login': ['guest','staff','supervisor','admin','owner'],
  'staff': ['staff'],
  'barang_masuk': ['staff'],
  'barang_keluar': ['staff'],
  'supervisor': ['supervisor'],
  'approval': ['supervisor'],
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
    alert('Anda tidak punya akses ke halaman ini.');
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

// ---------- Page actions (login/staff/supervisor/admin/owner) ----------

/* init_login */
function init_login(){ /* nothing special */ }

/* init_staff */
function init_staff(){
  const el = document.getElementById('staffPanel');
  if (el){
    const items = storageGet('swims_items') || [];
    el.innerHTML = `<div class="card"><h2>Staff Dashboard</h2>
      <p>Selamat datang, ${currentUser().username}. Gunakan menu untuk input barang.</p>
      <p>Jumlah jenis barang: <b>${items.length}</b></p></div>`;
  }
}

/* Barang masuk */
function init_barang_masuk(){
  const form = document.getElementById('formBarangMasuk');
  const sel = document.getElementById('bm_item');
  const items = storageGet('swims_items') || [];
  sel.innerHTML = items.map(it=>`<option value="${it.id}">${it.sku} — ${it.name} (stok:${it.total_stock})</option>`).join('');
  form.onsubmit = function(e){
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== 'staff') return alert('Hanya Staff yang boleh input barang masuk.');
    const itemId = parseInt(sel.value);
    const qty = parseInt(document.getElementById('bm_qty').value) || 0;
    if (qty <= 0) return alert('Jumlah harus > 0');
    const txns = storageGet('swims_txns') || [];
    const txn = { id:newid('txn'), txn_number:'TXN-'+Date.now(), type:'IN', created_by:user.username, created_at:new Date().toISOString(), status:'approved', items:[{item_id:itemId, qty:qty}], note:''};
    txns.push(txn);
    storageSet('swims_txns', txns);
    const itemsList = storageGet('swims_items') || [];
    const it = itemsList.find(x=>x.id===itemId);
    it.total_stock = (it.total_stock||0) + qty;
    storageSet('swims_items', itemsList);
    alert('Barang masuk disimpan & stok diupdate.');
    loadPage('staff');
  }
}

/* Barang keluar */
function init_barang_keluar(){
  const form = document.getElementById('formBarangKeluar');
  const sel = document.getElementById('bk_item');
  const items = storageGet('swims_items') || [];
  sel.innerHTML = items.map(it=>`<option value="${it.id}">${it.sku} — ${it.name} (stok:${it.total_stock})</option>`).join('');
  form.onsubmit = function(e){
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== 'staff') return alert('Hanya Staff yang boleh request barang keluar.');
    const itemId = parseInt(sel.value);
    const qty = parseInt(document.getElementById('bk_qty').value) || 0;
    if (qty <= 0) return alert('Jumlah harus > 0');
    const itemsList = storageGet('swims_items') || [];
    const it = itemsList.find(x=>x.id===itemId);
    if (!it) return alert('Item tidak ditemukan');
    if (qty > it.total_stock) return alert('Jumlah melebihi stok saat ini');
    const txns = storageGet('swims_txns') || [];
    const txn = { id:newid('txn'), txn_number:'TXN-'+Date.now(), type:'OUT', created_by:user.username, created_at:new Date().toISOString(), status:'pending', items:[{item_id:itemId, qty:qty}], note:document.getElementById('bk_note').value||''};
    txns.push(txn);
    storageSet('swims_txns', txns);
    alert('Transaksi keluar tersimpan PENDING. Menunggu approval Supervisor.');
    loadPage('staff');
  }
}

/* Supervisor landing */
function init_supervisor(){
  const el = document.getElementById('supervisorPanel');
  if (el){
    el.innerHTML = `<div class="card"><h2>Supervisor Dashboard</h2><p>Gunakan menu Approval untuk melihat transaksi pending.</p></div>`;
  }
}

/* Approval page */
function init_approval(){
  const tbl = document.getElementById('approvalList');
  const txns = storageGet('swims_txns') || [];
  const pending = txns.filter(t=>t.status==='pending');
  if (pending.length === 0){
    tbl.innerHTML = '<div class="card"><p>Tidak ada transaksi pending.</p></div>';
    return;
  }
  const rows = pending.map(tx=>{
    const item = storageGet('swims_items').find(i=>i.id===tx.items[0].item_id);
    return `<tr>
      <td>${tx.txn_number}</td>
      <td>${tx.created_by}</td>
      <td>${item ? item.name : 'Unknown'}</td>
      <td>${tx.items[0].qty}</td>
      <td>${tx.note||''}</td>
      <td>
        <button class="btn success" onclick="approveTxn('${tx.id}')">Approve</button>
        <button class="btn danger" onclick="rejectTxn('${tx.id}')">Reject</button>
      </td>
    </tr>`;
  }).join('');
  tbl.innerHTML = `<div class="card"><h3>Pending Transactions</h3>
    <table class="table"><thead><tr><th>Txn</th><th>By</th><th>Item</th><th>Qty</th><th>Note</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* Approve logic with QR generation */
function approveTxn(txnId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('Hanya Supervisor yang bisa approve.');
  let txns = storageGet('swims_txns') || [];
  const tx = txns.find(t=>t.id===txnId);
  if (!tx) return alert('Transaksi tidak ditemukan');

  // update stock
  const items = storageGet('swims_items') || [];
  tx.items.forEach(itm=>{
    const it = items.find(x=>x.id===itm.item_id);
    if (it) it.total_stock = (it.total_stock||0) - itm.qty;
  });
  storageSet('swims_items', items);

  // mark txn approved and create note
  tx.status = 'approved';
  tx.approved_by = user.username;
  tx.approved_at = new Date().toISOString();
  tx.note_id = newid('note');
  txns = txns.map(t=> t.id===txnId ? tx : t);
  storageSet('swims_txns', txns);

  // create note record (payload + dummy signature)
  const notes = storageGet('swims_notes') || [];
  const payload = { txn_number: tx.txn_number, items: tx.items, approved_by: user.username, approved_at: tx.approved_at };
  const signature = btoa(JSON.stringify(payload)).slice(0,64); // dummy signature
  const noteObj = { id: tx.note_id, note_number:'NOTE-'+Date.now(), transaction_id:tx.id, payload, signature, created_by:user.username, created_at:tx.approved_at, qrDataURL: null };

  // Generate QR image that contains minimal verify data (note_id + signature)
  // Using qrcodejs library: generate in a temporary container then read img src
  const tmp = document.createElement('div');
  tmp.style.position = 'fixed';
  tmp.style.left = '-9999px';
  document.body.appendChild(tmp);
  const qrText = JSON.stringify({ note_id: noteObj.id, signature: noteObj.signature });
  const qrcode = new QRCode(tmp, { text: qrText, width: 200, height: 200 });
  // qrcodejs inserts an <img> or <canvas> inside tmp; wait a tick to let it render
  setTimeout(() => {
    const img = tmp.querySelector('img');
    if (img && img.src){
      noteObj.qrDataURL = img.src;
    } else {
      // fallback: use canvas toDataURL if canvas exists
      const canvas = tmp.querySelector('canvas');
      if (canvas) noteObj.qrDataURL = canvas.toDataURL();
      else noteObj.qrDataURL = null;
    }
    // remove temp element
    document.body.removeChild(tmp);
    // save note
    notes.push(noteObj);
    storageSet('swims_notes', notes);
    alert('Transaksi approved & nota dibuat. QR tersedia di halaman Notes.');
    loadPage('approval');
  }, 120); // small delay to allow QR lib to render
}

/* Reject */
function rejectTxn(txnId){
  const user = currentUser();
  if (!user || user.role !== 'supervisor') return alert('Hanya Supervisor yang bisa reject.');
  let txns = storageGet('swims_txns') || [];
  const tx = txns.find(t=>t.id===txnId);
  if (!tx) return alert('Transaksi tidak ditemukan');
  tx.status = 'rejected';
  tx.rejected_by = user.username;
  tx.rejected_at = new Date().toISOString();
  txns = txns.map(t=> t.id===txnId ? tx : t);
  storageSet('swims_txns', txns);
  alert('Transaksi direject.');
  loadPage('approval');
}

/* Admin pages */
function init_admin(){
  const el = document.getElementById('adminPanel');
  if (!el) return;
  const users = storageUsers();
  const rows = users.map(u=>`<tr><td>${u.id}</td><td>${u.username}</td><td>${u.role}</td></tr>`).join('');
  el.innerHTML = `<div class="card"><h3>Admin - User Management</h3>
    <table class="table"><thead><tr><th>ID</th><th>Username</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table>
    <h4>Tambah User</h4>
    <label>Username</label><input id="new_username">
    <label>Role</label><select id="new_role"><option value="staff">staff</option><option value="supervisor">supervisor</option><option value="admin">admin</option><option value="owner">owner</option></select>
    <button class="btn primary" onclick="adminAddUser()">Buat user</button></div>`;
}
function adminAddUser(){
  const un = document.getElementById('new_username').value.trim();
  const role = document.getElementById('new_role').value;
  if (!un) return alert('Isi username');
  const users = storageUsers();
  if (users.find(u=>u.username===un)) return alert('Username sudah ada');
  const id = users.length ? Math.max(...users.map(u=>u.id))+1 : 1;
  users.push({id, username:un, role});
  storageSet('swims_users', users);
  alert('User dibuat: '+un);
  init_admin();
}

/* Owner pages */
function init_owner(){
  const el = document.getElementById('ownerPanel');
  if (!el) return;
  const items = storageGet('swims_items') || [];
  const txns = storageGet('swims_txns') || [];
  const notes = storageGet('swims_notes') || [];
  el.innerHTML = `<div class="card"><h3>Owner Dashboard</h3>
    <p>Total jenis barang: <b>${items.length}</b></p>
    <p>Total stok: <b>${items.reduce((s,i)=>s+i.total_stock,0)}</b></p>
    <p>Pending transactions: <b>${txns.filter(t=>t.status==='pending').length}</b></p>
    <p>Approved transactions: <b>${txns.filter(t=>t.status==='approved').length}</b></p>
    <p>Notes (issued): <b>${notes.length}</b></p>
    </div>`;
}

/* NOTES page (Supervisor & Owner) */
function init_notes(){
  const el = document.getElementById('notesList');
  const notes = storageGet('swims_notes') || [];
  if (!notes.length){
    el.innerHTML = '<div class="card"><p>Tidak ada nota.</p></div>';
    return;
  }
  const rows = notes.map(n=>{
    const txns = storageGet('swims_txns') || [];
    const txn = txns.find(t=>t.id===n.transaction_id) || {txn_number:'-'};
    return `<tr>
      <td>${n.note_number}</td>
      <td>${txn.txn_number}</td>
      <td>${n.created_by}</td>
      <td>${n.created_at}</td>
      <td>
        ${n.qrDataURL ? `<img src="${n.qrDataURL}" style="width:120px;height:120px;border:1px solid #eee;border-radius:6px">` : '<span class="small">QR tidak tersedia</span>'}
      </td>
      <td><button class="btn" onclick='verifyNote("${n.id}")'>Verify</button></td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="card"><h3>Daftar Nota</h3>
    <table class="table"><thead><tr><th>No Nota</th><th>Txn</th><th>Issued By</th><th>Created</th><th>QR</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* Verify note (recompute dummy signature and compare) */
function verifyNote(noteId){
  const notes = storageGet('swims_notes') || [];
  const n = notes.find(x=>x.id===noteId);
  if (!n) return alert('Nota tidak ditemukan');
  // recompute signature the same way we generated
  const recomputed = btoa(JSON.stringify(n.payload)).slice(0,64);
  if (recomputed === n.signature){
    alert('VERIFY RESULT: VALID');
  } else {
    alert('VERIFY RESULT: INVALID');
  }
}

// Reset demo: clear demo storage but keep items/users if you want; here we clear current_user & txns & notes (safer)
function resetDemo(){
  if (!confirm('Reset demo: menghapus current session & transaksi/nota?')) return;
  localStorage.removeItem('swims_current_user');
  localStorage.removeItem('swims_txns');
  localStorage.removeItem('swims_notes');
  // keep users and items so you don't lose defaults; if you want completely fresh, uncomment below:
  // localStorage.removeItem('swims_users'); localStorage.removeItem('swims_items');
  initApp();     // re-init defaults if needed
  renderUserBar();
  renderMenu();
  loadPage('login');
}

// Force show login on initial open regardless of existing session (optional)
// If you prefer always to require login at start, call resetDemo() on startup.
// Uncomment the line below to force logout on load:
// resetDemo();


// expose to global scope for pages
window.loginAs = loginAs;
window.logout = logout;
window.loadPage = loadPage;
window.initApp = initApp;
window.renderUserBar = renderUserBar;
window.renderMenu = renderMenu;
window.currentUser = currentUser;
window.storageGet = storageGet;
window.storageSet = storageSet;
window.init_login = init_login;
window.init_staff = init_staff;
window.init_barang_masuk = init_barang_masuk;
window.init_barang_keluar = init_barang_keluar;
window.init_supervisor = init_supervisor;
window.init_approval = init_approval;
window.init_admin = init_admin;
window.init_owner = init_owner;
window.init_notes = init_notes;
