/**
 * =========================================================
 * APPROVAL.JS - v4.0 with Unified PDF Generator & Hash
 * =========================================================
 */

console.log('🔐 [APPROVAL v4.0] Loading with hash signature support...');

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
    
    content.innerHTML = `
        <div class="card">
            <h2>🏢 Approval Klien/Supplier Baru</h2>
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
        '⚠️ Konfirmasi',
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
                    // ✅ APPROVE SUCCESS - Show PDF Download Option
                    if (isApprove && action === 'approve_transaction' && data.data && data.data.transaction) {
                        currentApprovedTransaction = data.data.transaction;
                        
                        showApprovalSuccessModal(data.data.transaction);
                    } else {
                        showMessageModal('✅ Sukses', data.message, false);
                    }
                    
                    // Reload data
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
// SHOW APPROVAL SUCCESS MODAL
// ========================================
function showApprovalSuccessModal(transaction) {
    const notaNumber = `NOTE-${transaction.id}-${Date.now().toString().slice(-6)}`;
    const hasHash = !!transaction.nota_hash;
    
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Berhasil Di-Approve!</h3>
            
            ${hasHash ? `
                <div style="background:#dcfce7; padding:12px; border-radius:8px; margin:15px 0; border-left:4px solid var(--success);">
                    <h4 style="margin:0 0 8px 0; color:#166534;">🔐 Digital Signature Generated</h4>
                    <p class="small" style="margin:0; color:#166534;">
                        Hash: <code style="font-size:0.75rem;">${transaction.nota_hash.substring(0, 32)}...</code>
                    </p>
                </div>
            ` : ''}
            
            <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin:20px 0; text-align:left;">
                <h4 style="margin:0 0 10px 0; color:#1e40af;">📋 Detail Transaksi:</h4>
                <table style="width:100%; font-size:0.9rem;">
                    <tr>
                        <td style="padding:5px 0;"><strong>Kode:</strong></td>
                        <td style="padding:5px 0;">${transaction.transaction_code}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Type:</strong></td>
                        <td style="padding:5px 0;">${transaction.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Item:</strong></td>
                        <td style="padding:5px 0;">${transaction.item_name} (${transaction.sku})</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Quantity:</strong></td>
                        <td style="padding:5px 0;"><strong>${transaction.quantity}</strong> ${transaction.unit || 'pcs'}</td>
                    </tr>
                </table>
            </div>
            
            <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
                <button class="btn success" onclick="downloadApprovedNotaPDF()">
                    📄 Download PDF Nota
                </button>
                <button class="btn primary" onclick="closeApprovalSuccessModal()">
                    Tutup
                </button>
            </div>
        </div>
    `;
    
    showMessageModal('✅ Approval Berhasil', modalContent, false);
}

// ========================================
// DOWNLOAD PDF FROM APPROVAL
// ========================================
function downloadApprovedNotaPDF() {
    if (!currentApprovedTransaction) {
        showMessageModal('Error', 'Data transaksi tidak tersedia', false);
        return;
    }
    
    console.log('📄 Downloading PDF for approved transaction:', currentApprovedTransaction.transaction_code);
    
    // Close modal first
    closeApprovalSuccessModal();
    
    // Generate PDF using unified generator
    if (typeof generateSecureNotaPDF === 'function') {
        generateSecureNotaPDF(
            currentApprovedTransaction,
            (result) => {
                console.log('✅ PDF download success:', result);
                showMessageModal(
                    '✅ Sukses',
                    `Nota PDF <strong>${result.filename}</strong> berhasil didownload.<br><br>
                    ${result.has_signature ? '<span style="color:var(--success);">🔐 Protected by digital signature</span>' : ''}`,
                    false
                );
            },
            (error) => {
                console.error('❌ PDF download error:', error);
            }
        );
    } else {
        showMessageModal('Error', 'PDF generator module not loaded. Please refresh the page.', false);
    }
}

// ========================================
// CLOSE MODAL
// ========================================
function closeApprovalSuccessModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentApprovedTransaction = null;
}

// ========================================
// FILTER TRANSACTIONS
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
// LEGACY SUPPORT
// ========================================
function closeNotaModal() {
    const modal = document.getElementById('notaModal');
    if (modal) modal.style.display = 'none';
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.loadApprovalData = loadApprovalData;
window.handleApprovalAction = handleApprovalAction;
window.filterTransactions = filterTransactions;
window.downloadApprovedNotaPDF = downloadApprovedNotaPDF;
window.closeApprovalSuccessModal = closeApprovalSuccessModal;
window.closeNotaModal = closeNotaModal;

console.log('✅ [APPROVAL v4.0] Module loaded with hash signature support');