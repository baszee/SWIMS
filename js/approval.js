/**
 * =========================================================
 * APPROVAL.JS - FINAL FIXED VERSION
 * Fitur: Approval Transaksi & Supplier (Acc/Reject)
 * =========================================================
 */

let currentTransactionFilter = 'ALL';
let allTransactions = [];
let currentApprovedTransaction = null;

// ========================================
// INIT FUNCTIONS
// ========================================

function init_approval() {
    console.log('🚀 Init Approval Transaksi');
    loadApprovalData('transactions');
}

function init_approval_items() {
    console.log('🚀 Init Approval Suppliers Only');
    const content = document.getElementById('content');
    
    // Tampilan khusus Approval Supplier (Tanpa Tab)
    content.innerHTML = `
        <div class="card">
            <h2>✅ Approval Klien/Supplier Baru</h2>
            <p class="small">Supervisor menyetujui data Klien atau Supplier baru yang diajukan oleh Staff.</p>
        </div>
        <div id="approvalItemsList"></div>
    `;

    loadApprovalData('suppliers');
}

// ========================================
// LOAD APPROVAL DATA
// ========================================

async function loadApprovalData(type) {
    const listDiv = document.getElementById(type === 'transactions' ? 'approvalList' : 'approvalItemsList');
    if (!listDiv) return;
    
    listDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat...</p></div>';
    showLoadingModal('Mengambil data...');
    
    try {
        const response = await fetch(`api/approval.php?action=${type}`);
        const data = await response.json();
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">❌ ${data.message}</p></div>`;
            return;
        }
        
        if (data.data.length === 0) {
            listDiv.innerHTML = `
                <div class="card" style="text-align:center; padding:40px;">
                    <p style="font-size:3rem; margin:0;">✅</p>
                    <p style="color:var(--success); font-weight:600;">Semua sudah di-approve!</p>
                </div>
            `;
            return;
        }
        
        if (type === 'transactions') {
            allTransactions = data.data;
            renderTransactionList(data.data);
        } else if (type === 'suppliers') {
            renderSupplierList(data.data);
        }
        
    } catch (error) {
        listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">❌ Error: ${error.message}</p></div>`;
        console.error('Load approval error:', error);
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// RENDER FUNCTIONS
// ========================================

function renderTransactionList(transactions) {
    const listDiv = document.getElementById('approvalList');
    
    let html = '<div class="card"><h3>📋 Daftar Transaksi Pending</h3>';
    html += '<table class="table"><thead><tr>';
    html += '<th>Kode</th><th>Tipe</th><th>Item</th><th>Qty</th><th>Requester</th><th>Tanggal</th><th>Detail</th><th>Aksi</th></tr></thead><tbody>';
    
    transactions.forEach(t => {
        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in">📦 MASUK</span>' 
            : '<span class="badge badge-out">📤 KELUAR</span>';
        
        let detailInfo = t.type === 'IN' 
            ? `<span class="small">Supplier: <b>${t.supplier_name || '-'}</b></span>`
            : `<span class="small">Penerima: <b>${t.recipient_name || '-'}</b></span>`;
        
        html += `
            <tr>
                <td><b>${t.transaction_code}</b></td>
                <td>${typeBadge}</td>
                <td>${t.item_name}<br><span class="small">(${t.sku})</span></td>
                <td><b>${t.quantity}</b> ${t.unit}</td>
                <td>${t.requester_name}</td>
                <td>${t.request_date.substring(0, 16)}</td>
                <td>${detailInfo}</td>
                <td>
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_transaction', ${t.id}, ${JSON.stringify(t).replace(/"/g, '&quot;')})">✅ Approve</button>
                    <button class="btn danger btn-sm" onclick="handleApprovalAction('reject_transaction', ${t.id})">❌ Reject</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    listDiv.innerHTML = html;
}

function renderSupplierList(suppliers) {
    const listDiv = document.getElementById('approvalItemsList');
    
    let html = '<div class="card"><h3>🏢 Klien/Supplier Baru Pending</h3>';
    html += '<table class="table"><thead><tr>';
    html += '<th>Nama</th><th>Kontak</th><th>Telepon</th><th>Alamat</th><th>Requester</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    
    suppliers.forEach(s => {
        html += `
            <tr>
                <td><b>${s.name}</b></td>
                <td>${s.contact_person || '-'}</td>
                <td>${s.phone || '-'}</td>
                <td class="small">${s.address || '-'}</td>
                <td>${s.requester_name}</td>
                <td>${s.created_at.substring(0, 16)}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn success btn-sm" onclick="handleApprovalAction('approve_supplier', ${s.id})">✅ Acc</button>
                        <button class="btn danger btn-sm" onclick="handleApprovalAction('reject_supplier', ${s.id})">❌ Tolak</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    listDiv.innerHTML = html;
}

// ========================================
// APPROVAL ACTION HANDLER
// ========================================

async function handleApprovalAction(action, id, transactionData = null) {
    const isApprove = action.includes('approve');
    const confirmMsg = isApprove ? 'menyetujui' : 'menolak';
    
    showMessageModal(
        'Konfirmasi',
        `Yakin ingin ${confirmMsg} data ini?`,
        true,
        async () => {
            showLoadingModal('Memproses...');
            try {
                const response = await fetch('api/approval.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ action, id })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (isApprove && action === 'approve_transaction' && transactionData) {
                        currentApprovedTransaction = transactionData;
                        showNotaModal(transactionData);
                    } else {
                        showMessageModal('✅ Sukses', data.message, false);
                    }
                    
                    // Reload data yang sesuai
                    if (action.includes('transaction')) loadApprovalData('transactions');
                    else if (action.includes('supplier')) loadApprovalData('suppliers');
                    
                    // Update stats dashboard jika ada
                    if (typeof loadSupervisorStats === 'function') loadSupervisorStats();
                    
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', 'Koneksi gagal: ' + error.message, false);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// ========================================
// FILTER & UTILS
// ========================================

function filterTransactions(type) {
    currentTransactionFilter = type;
    const btns = document.querySelectorAll('.card button[onclick^="filterTransactions"]');
    btns.forEach(b => b.className = 'btn btn-sm');
    event.target.className = 'btn primary btn-sm';
    
    document.getElementById('filterStatus').innerHTML = `Menampilkan: <b>${type}</b>`;
    
    let filtered = allTransactions;
    if (type !== 'ALL') filtered = allTransactions.filter(t => t.type === type);
    renderTransactionList(filtered);
}

// ========================================
// NOTA & PDF
// ========================================

function showNotaModal(transaction) {
    const modal = document.getElementById('notaModal');
    const detailsDiv = document.getElementById('notaDetails');
    const qrContainer = document.getElementById('qrCodeContainer');
    const notaNumber = `NOTE-${Date.now()}`;
    
    detailsDiv.innerHTML = `
        <p><strong>No Nota:</strong> ${notaNumber}</p>
        <p><strong>Kode:</strong> ${transaction.transaction_code}</p>
        <p><strong>Item:</strong> ${transaction.item_name}</p>
        <p><strong>Jumlah:</strong> ${transaction.quantity} ${transaction.unit}</p>
        <p><strong>Disetujui:</strong> ${currentUser().username}</p>
    `;
    
    qrContainer.innerHTML = '<div id="qrcode"></div>';
    const qrData = `TXN-${transaction.transaction_code}|STATUS-APPROVED`;
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('qrcode'), { text: qrData, width: 150, height: 150 });
    }
    
    modal.style.display = 'flex';
}

function closeNotaModal() {
    document.getElementById('notaModal').style.display = 'none';
}

function downloadNota() {
    if (!currentApprovedTransaction) return;
    // Logika PDF Sederhana (Text fallback)
    const blob = new Blob([JSON.stringify(currentApprovedTransaction, null, 2)], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nota_${currentApprovedTransaction.transaction_code}.txt`;
    a.click();
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.loadApprovalData = loadApprovalData;
window.handleApprovalAction = handleApprovalAction;
window.filterTransactions = filterTransactions;
window.closeNotaModal = closeNotaModal;
window.downloadNota = downloadNota;

console.log('✅ Approval Module Loaded');