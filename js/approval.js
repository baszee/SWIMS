/**
 * =========================================================
 * APPROVAL.JS - INTEGRATED WITH SHARED PDF GENERATOR
 * Updated: Uses window.generateSecureNotaPDF
 * =========================================================
 */

console.log('🚀 [APPROVAL v5.0] Loading Modular Version...');

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
// LOAD DATA
// ========================================

async function loadApprovalData(type) {
    const listDiv = document.getElementById(type === 'transactions' ? 'approvalList' : 'approvalItemsList');
    if (!listDiv) return;
    
    listDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat...</p></div>';
    
    try {
        const response = await fetch(`api/approval.php?action=${type}`);
        const data = await response.json();
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">⚠️ ${data.message}</p></div>`;
            return;
        }
        
        if (data.data.length === 0) {
            listDiv.innerHTML = `
                <div class="card" style="text-align:center; padding:40px;">
                    <p style="font-size:3rem; margin:0;">🎉</p>
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
    }
}

// ========================================
// RENDER UI
// ========================================

function renderTransactionList(transactions) {
    const listDiv = document.getElementById('approvalList');
    
    let html = '<div class="card"><h3>📋 Daftar Transaksi Pending</h3>';
    html += '<table class="table"><thead><tr>';
    html += '<th>Kode</th><th>Tipe</th><th>Item</th><th>Qty</th><th>Requester</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    
    transactions.forEach(t => {
        const safeItem = SecurityUtils.escapeHtml(t.item_name);
        const safeSku = SecurityUtils.escapeHtml(t.sku);
        const safeUnit = SecurityUtils.escapeHtml(t.unit);
        const safeReq = SecurityUtils.escapeHtml(t.requester_name);
        const safeCode = SecurityUtils.escapeHtml(t.transaction_code);
        const safeQty = SecurityUtils.escapeHtml(t.quantity);

        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in">⬇️ MASUK</span>' 
            : '<span class="badge badge-out">⬆️ KELUAR</span>';
        
        html += `
            <tr>
                <td><b>${safeCode}</b></td>
                <td>${typeBadge}</td>
                <td>${safeItem}<br><span class="small">(${safeSku})</span></td>
                <td><b>${safeQty}</b> ${safeUnit}</td>
                <td>${safeReq}</td>
                <td>${t.request_date.substring(0, 16)}</td>
                <td>
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_transaction', ${t.id})">✅ Approve</button>
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
    html += '<th>Nama</th><th>Kontak</th><th>Alamat</th><th>Requester</th><th>Aksi</th></tr></thead><tbody>';
    
    suppliers.forEach(s => {
        const safeName = SecurityUtils.escapeHtml(s.name);
        const safeContact = SecurityUtils.escapeHtml(s.contact_person || '-');
        const safeAddress = SecurityUtils.escapeHtml(s.address || '-');
        const safeReq = SecurityUtils.escapeHtml(s.requester_name);

        html += `
            <tr>
                <td><b>${safeName}</b></td>
                <td>${safeContact}</td>
                <td class="small">${safeAddress}</td>
                <td>${safeReq}</td>
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
// ACTION HANDLER
// ========================================

async function handleApprovalAction(action, id) {
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
                    if (isApprove && action === 'approve_transaction' && data.data && data.data.transaction) {
                        currentApprovedTransaction = data.data.transaction;
                        showApprovalSuccessModal(data.data.transaction);
                    } else {
                        showMessageModal('✅ Sukses', data.message, false);
                    }
                    
                    // Refresh data
                    if (action.includes('transaction')) loadApprovalData('transactions');
                    else if (action.includes('supplier')) loadApprovalData('suppliers');
                    
                    if (typeof loadSupervisorStats === 'function') loadSupervisorStats();
                    
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                console.error('Approval error:', error);
                showMessageModal('Error', 'Koneksi gagal: ' + error.message, false);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// ========================================
// SUCCESS MODAL (With PDF Download)
// ========================================

function showApprovalSuccessModal(transaction) {
    const hasHash = !!transaction.nota_hash;
    
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Approved!</h3>
            
            ${hasHash ? `
                <div style="background:#f0fdf4; padding:10px; border-radius:8px; margin:15px 0; border:1px solid #bbf7d0;">
                    <p class="small" style="margin:0; color:#15803d;">
                        🔐 <strong>Cryptographic Seal Generated</strong><br>
                        Data integritas terkunci dengan aman.
                    </p>
                </div>
            ` : ''}
            
            <p>Kode: <strong>${transaction.transaction_code}</strong></p>
            
            <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
                <button class="btn success" onclick="downloadApprovedNotaPDF()">
                    📄 Download Nota Resmi
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
// 🔴 CORE: PDF GENERATION (LINKED TO SHARED MODULE)
// ========================================

function downloadApprovedNotaPDF() {
    if (!currentApprovedTransaction) return;
    
    console.log("🔗 Generating PDF using Shared Module...");
    showLoadingModal('Mencetak Nota...');
    
    // Cek apakah pdf_generator.js sudah diload
    if (typeof window.generateSecureNotaPDF === 'function') {
        window.generateSecureNotaPDF(
            currentApprovedTransaction,
            (result) => {
                hideLoadingModal();
                closeApprovalSuccessModal();
                // showMessageModal('✅ Sukses', 'Nota berhasil didownload!', false);
            },
            (error) => {
                hideLoadingModal();
                showMessageModal('Error', error.message, false);
            }
        );
    } else {
        hideLoadingModal();
        alert('CRITICAL ERROR: pdf_generator.js belum diload di index.php!');
    }
}

function closeApprovalSuccessModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.style.display = 'none';
    currentApprovedTransaction = null;
}

// Expose to Global
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.loadApprovalData = loadApprovalData;
window.handleApprovalAction = handleApprovalAction;
window.downloadApprovedNotaPDF = downloadApprovedNotaPDF;
window.closeApprovalSuccessModal = closeApprovalSuccessModal;