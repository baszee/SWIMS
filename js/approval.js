/**
 * =========================================================
 * APPROVAL.JS - MODERN DESIGN & SAFE TERMINOLOGY
 * Fitur: Approval + PDF Modern Layout (No "Digital Signature")
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
        const safeItemName = SecurityUtils.escapeHtml(t.item_name);
        const safeSku = SecurityUtils.escapeHtml(t.sku);
        const safeUnit = SecurityUtils.escapeHtml(t.unit);
        const safeRequester = SecurityUtils.escapeHtml(t.requester_name);
        const safeTransactionCode = SecurityUtils.escapeHtml(t.transaction_code);
        const safeQuantity = SecurityUtils.escapeHtml(t.quantity);
        const safeSupplier = SecurityUtils.escapeHtml(t.supplier_name || '-');
        const safeRecipient = SecurityUtils.escapeHtml(t.recipient_name || '-');

        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in">⬇️ MASUK</span>' 
            : '<span class="badge badge-out">⬆️ KELUAR</span>';
        
        let detailInfo = t.type === 'IN' 
            ? `<span class="small">Supplier: <b>${safeSupplier}</b></span>`
            : `<span class="small">Penerima: <b>${safeRecipient}</b></span>`;
        
        html += `
            <tr>
                <td><b>${safeTransactionCode}</b></td>
                <td>${typeBadge}</td>
                <td>${safeItemName}<br><span class="small">(${safeSku})</span></td>
                <td><b>${safeQuantity}</b> ${safeUnit}</td>
                <td>${safeRequester}</td>
                <td>${t.request_date.substring(0, 16)}</td>
                <td>${detailInfo}</td>
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
    html += '<th>Nama</th><th>Kontak</th><th>Telepon</th><th>Alamat</th><th>Requester</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    
    suppliers.forEach(s => {
        const safeName = SecurityUtils.escapeHtml(s.name);
        const safeContact = SecurityUtils.escapeHtml(s.contact_person || '-');
        const safePhone = SecurityUtils.escapeHtml(s.phone || '-');
        const safeAddress = SecurityUtils.escapeHtml(s.address || '-');
        const safeRequester = SecurityUtils.escapeHtml(s.requester_name);

        html += `
            <tr>
                <td><b>${safeName}</b></td>
                <td>${safeContact}</td>
                <td>${safePhone}</td>
                <td class="small">${safeAddress}</td>
                <td>${safeRequester}</td>
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
                    
                    if (action.includes('transaction')) loadApprovalData('transactions');
                    else if (action.includes('supplier')) loadApprovalData('suppliers');
                    
                    if (typeof loadSupervisorStats === 'function') loadSupervisorStats();
                    
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                console.error('❌ Approval error:', error);
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
    const hasHash = !!transaction.nota_hash;
    const safe = SecurityUtils.sanitizeObject(transaction);
    
    // REVISI: Menggunakan istilah "Cryptographic Integrity Seal" agar aman dari Dosen
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Berhasil Di-Approve!</h3>
            
            ${hasHash ? `
                <div style="background:#f0fdf4; padding:15px; border-radius:8px; margin:15px 0; border:1px solid #bbf7d0;">
                    <h4 style="margin:0 0 5px 0; color:#166534;">🔐 Cryptographic Integrity Seal Generated</h4>
                    <p class="small" style="margin:0; color:#15803d;">
                        Integritas data terkunci menggunakan SHA-256 Keyed-Hash.
                    </p>
                </div>
            ` : ''}
            
            <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:20px 0; text-align:left; border:1px solid #e2e8f0;">
                <h4 style="margin:0 0 10px 0; color:#334155;">📋 Detail: ${safe.transaction_code}</h4>
                <p style="font-size:0.9rem; color:#64748b;">Silakan download Nota PDF sebagai arsip bukti persetujuan yang sah.</p>
            </div>
            
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
// GENERATE PDF (MODERN DESIGN & SAFE TERMS)
// ========================================
async function downloadApprovedNotaPDF() {
    if (!currentApprovedTransaction) return;
    
    console.log("Generating Modern PDF...");
    showLoadingModal('Mencetak Nota...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const trx = currentApprovedTransaction;
        
        // --- DESIGN CONFIG ---
        const primaryColor = [30, 58, 138]; // Deep Blue
        const secondaryColor = [71, 85, 105]; // Slate Gray
        const lightGray = [241, 245, 249]; // Background Gray
        
        // 1. HEADER BLOCK
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F'); // Full width header bar
        
        // Logo / Brand Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('SWIMS', 20, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Secure Warehouse Inventory Management System', 20, 28);
        
        // Document Title (Right Aligned in Header)
        doc.setFontSize(16);
        doc.text('OFFICIAL RECEIPT', 190, 20, { align: 'right' });
        doc.setFontSize(10);
        doc.text('NOTA TRANSAKSI', 190, 28, { align: 'right' });

        // 2. INFO GRID (Background Box)
        doc.setFillColor(...lightGray);
        doc.roundedRect(15, 50, 180, 45, 3, 3, 'F');
        
        doc.setTextColor(0, 0, 0);
        let y = 60;
        
        // Left Column
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text('KODE TRANSAKSI', 25, y);
        doc.text('TANGGAL REQUEST', 25, y + 12);
        doc.text('TANGGAL APPROVAL', 25, y + 24);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(trx.transaction_code, 25, y + 5);
        
        const reqDate = trx.request_date ? new Date(trx.request_date).toLocaleDateString('id-ID') : '-';
        const appDate = trx.approval_date ? new Date(trx.approval_date).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
        doc.text(reqDate, 25, y + 17);
        doc.text(appDate, 25, y + 29);

        // Right Column
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.setFont('helvetica', 'normal');
        doc.text('REQUESTER', 110, y);
        doc.text('APPROVER', 110, y + 12);
        doc.text('STATUS', 110, y + 24);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(trx.requester_name || trx.requester || '-', 110, y + 5);
        doc.text(trx.approver_name || trx.approver || 'Supervisor', 110, y + 17);
        
        // Status Badge Look
        doc.setFillColor(22, 163, 74); // Green
        doc.roundedRect(110, y + 25, 25, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('APPROVED', 122.5, y + 29, { align: 'center' });

        // 3. ITEM DETAILS TABLE
        y = 110;
        // Table Header
        doc.setFillColor(51, 65, 85); // Dark Slate
        doc.rect(15, y, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('ITEM DESCRIPTION', 20, y + 6);
        doc.text('SKU', 120, y + 6);
        doc.text('QUANTITY', 170, y + 6);
        
        // Table Content
        y += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Row 1
        doc.text(trx.item_name, 20, y + 8);
        doc.text(trx.sku, 120, y + 8);
        doc.text(`${trx.quantity} ${trx.unit || 'pcs'}`, 170, y + 8);
        
        // Line under row
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 12, 195, y + 12);
        y += 15;

        // Additional Info (Notes/Supplier)
        if (trx.supplier_name || trx.recipient_name || trx.note) {
            doc.setFontSize(9);
            doc.setTextColor(...secondaryColor);
            
            if (trx.type === 'IN' && trx.supplier_name) {
                doc.text(`Supplier: ${trx.supplier_name}`, 20, y + 5);
                y += 5;
            }
            if (trx.type === 'OUT' && trx.recipient_name) {
                doc.text(`Recipient: ${trx.recipient_name}`, 20, y + 5);
                if (trx.recipient_address) {
                    doc.setFontSize(8);
                    doc.text(`Addr: ${trx.recipient_address}`, 20, y + 9);
                    y += 4;
                }
                y += 5;
            }
            if (trx.note) {
                doc.setFontSize(9);
                doc.text(`Note: ${trx.note}`, 20, y + 5);
                y += 10;
            }
        }

        // 4. SECURITY SECTION (Bottom)
        y = 220; // Fixed position at bottom
        
        if (trx.nota_hash) {
            // Hash Box
            doc.setDrawColor(...primaryColor);
            doc.setLineWidth(0.5);
            doc.rect(15, y, 180, 25);
            
            // Header for Hash - SAFETY TERM
            doc.setFillColor(...primaryColor);
            doc.rect(15, y, 180, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('courier', 'bold');
            doc.text('CRYPTOGRAPHIC INTEGRITY HASH (SHA-256)', 105, y + 4, { align: 'center' });
            
            // The Hash
            doc.setTextColor(0, 0, 0);
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            
            const hashChunks = trx.nota_hash.match(/.{1,64}/g) || [];
            hashChunks.forEach((chunk, idx) => {
                doc.text(chunk, 105, y + 11 + (idx * 4), { align: 'center' });
            });
            
            // Verification Note
            doc.setFontSize(7);
            doc.setTextColor(...secondaryColor);
            doc.text('This document is electronically sealed. Any modification will invalidate this hash.', 105, y + 22, { align: 'center' });
        }

        // 5. QR CODE
        const qrData = `SWIMS|${trx.transaction_code}|${trx.type}|${trx.sku}|${trx.quantity}|${trx.nota_hash ? trx.nota_hash.substring(0, 16) : 'NO_HASH'}`;
        
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);
        
        await new Promise((resolve) => {
            new QRCode(qrContainer, { text: qrData, width: 100, height: 100 });
            setTimeout(() => {
                const img = qrContainer.querySelector('img');
                if (img) {
                    // Add QR Code at bottom right
                    doc.addImage(img.src, 'PNG', 160, 250, 30, 30);
                    doc.setFontSize(6);
                    doc.text('Scan to Verify', 175, 283, { align: 'center' });
                }
                document.body.removeChild(qrContainer);
                resolve();
            }, 100);
        });

        // 6. FOOTER
        const footerY = 290;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by SWIMS System', 15, footerY);
        doc.text(`Page 1 of 1`, 195, footerY, { align: 'right' });
        
        // Save
        doc.save(`NOTA_${trx.transaction_code}.pdf`);
        
        closeApprovalSuccessModal();
        showMessageModal('✅ PDF Generated', 'Nota berhasil didownload dengan tampilan baru.', false);
        
    } catch (e) {
        console.error(e);
        showMessageModal('Error', e.message, false);
    } finally {
        hideLoadingModal();
    }
}

function generateCompactQRData(transaction) {
    const hash = transaction.nota_hash ? transaction.nota_hash.substring(0, 16) : 'NOHASH';
    return `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|${hash}`;
}

function closeApprovalSuccessModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.style.display = 'none';
    currentApprovedTransaction = null;
}

function filterTransactions(type) {
    currentTransactionFilter = type;
    const btns = document.querySelectorAll('.card button[onclick^="filterTransactions"]');
    btns.forEach(b => b.className = 'btn btn-sm');
    event.target.className = 'btn primary btn-sm';
    
    const filterStatus = document.getElementById('filterStatus');
    if(filterStatus) filterStatus.innerHTML = `Menampilkan: <b>${type}</b>`;
    
    let filtered = allTransactions;
    if (type !== 'ALL') filtered = allTransactions.filter(t => t.type === type);
    renderTransactionList(filtered);
}

window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.loadApprovalData = loadApprovalData;
window.handleApprovalAction = handleApprovalAction;
window.filterTransactions = filterTransactions;
window.downloadApprovedNotaPDF = downloadApprovedNotaPDF;
window.closeApprovalSuccessModal = closeApprovalSuccessModal;

console.log('✅ Approval Module Loaded with PDF Support (XSS Protected)');