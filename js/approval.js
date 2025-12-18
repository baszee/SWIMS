/**
 * =========================================================
 * APPROVAL.JS - FIXED VERSION with PDF Download (Merged) & XSS Protection
 * Fitur: Approval Transaksi & Supplier (Acc/Reject) + PDF Nota
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
// RENDER FUNCTIONS (XSS PROTECTED)
// ========================================

function renderTransactionList(transactions) {
    const listDiv = document.getElementById('approvalList');
    
    let html = '<div class="card"><h3>📋 Daftar Transaksi Pending</h3>';
    html += '<table class="table"><thead><tr>';
    html += '<th>Kode</th><th>Tipe</th><th>Item</th><th>Qty</th><th>Requester</th><th>Tanggal</th><th>Detail</th><th>Aksi</th></tr></thead><tbody>';
    
    transactions.forEach(t => {
        // ✅ SECURITY FIX: Escape user input via SecurityUtils
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
        // ✅ SECURITY FIX: Escape user input via SecurityUtils
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
                        
                        console.log('✅ Approved transaction data:', currentApprovedTransaction);
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
    const notaNumber = `NOTE-${transaction.id}-${Date.now().toString().slice(-6)}`;
    const hasHash = !!transaction.nota_hash;
    
    // Validasi data lengkap
    const missingFields = [];
    if (!transaction.nota_hash) missingFields.push('nota_hash');
    if (!transaction.approver && !transaction.approver_name) missingFields.push('approver');
    
    // ✅ SECURITY FIX: Sanitize object before display
    const safe = SecurityUtils.sanitizeObject(transaction);
    
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Berhasil Di-Approve!</h3>
            
            ${hasHash ? `
                <div style="background:#dcfce7; padding:12px; border-radius:8px; margin:15px 0; border-left:4px solid var(--success);">
                    <h4 style="margin:0 0 8px 0; color:#166534;">🔐 Digital Signature Generated</h4>
                    <p class="small" style="margin:0; color:#166534;">
                        Hash: <code style="font-size:0.75rem;">${safe.nota_hash.substring(0, 32)}...</code>
                    </p>
                </div>
            ` : `
                <div style="background:#fef3c7; padding:12px; border-radius:8px; margin:15px 0; border-left:4px solid #f59e0b;">
                    <p class="small" style="margin:0; color:#92400e;">
                        ⚠️ Warning: No hash signature (possible API error)
                    </p>
                </div>
            `}
            
            <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin:20px 0; text-align:left;">
                <h4 style="margin:0 0 10px 0; color:#1e40af;">📋 Detail Transaksi:</h4>
                <table style="width:100%; font-size:0.9rem;">
                    <tr>
                        <td style="padding:5px 0;"><strong>Kode:</strong></td>
                        <td style="padding:5px 0;">${safe.transaction_code}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Type:</strong></td>
                        <td style="padding:5px 0;">${safe.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Item:</strong></td>
                        <td style="padding:5px 0;">${safe.item_name} (${safe.sku})</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Quantity:</strong></td>
                        <td style="padding:5px 0;"><strong>${safe.quantity}</strong> ${safe.unit || 'pcs'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Requester:</strong></td>
                        <td style="padding:5px 0;">${safe.requester || safe.requester_name || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 0;"><strong>Approver:</strong></td>
                        <td style="padding:5px 0;">${safe.approver || safe.approver_name || 'System'}</td>
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
// GENERATE PDF FROM APPROVAL
// ========================================
async function downloadApprovedNotaPDF() {
    if (!currentApprovedTransaction) {
        showMessageModal('Error', 'Data transaksi tidak tersedia', false);
        return;
    }
    
    console.log('📄 Generating PDF for approved transaction:', currentApprovedTransaction.transaction_code);
    
    showLoadingModal('Generating PDF...');
    
    try {
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded!');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // ========================================
        // PDF HEADER
        // ========================================
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('SWIMS - NOTA TRANSAKSI', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Secure Warehouse Inventory Management System', 105, 27, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(20, 32, 190, 32);
        
        // ========================================
        // TRANSACTION INFO
        // ========================================
        let y = 42;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TRANSACTION INFORMATION', 20, y);
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const approvalDate = currentApprovedTransaction.updated_at || new Date().toLocaleString('id-ID');
        const approverName = currentApprovedTransaction.approver || currentApprovedTransaction.approver_name || 'Supervisor';
        const requesterName = currentApprovedTransaction.requester || currentApprovedTransaction.requester_name || '-';
        
        const info = [
            ['Transaction Code:', currentApprovedTransaction.transaction_code],
            ['Type:', currentApprovedTransaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR'],
            ['Status:', 'APPROVED'],
            ['Approval Date:', approvalDate],
            ['Requester:', requesterName],
            ['Approver:', approverName]
        ];
        
        info.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value), 70, y);
            y += 6;
        });
        
        // ========================================
        // ITEM DETAILS
        // ========================================
        y += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('ITEM DETAILS', 20, y);
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const itemInfo = [
            ['SKU:', currentApprovedTransaction.sku],
            ['Item Name:', currentApprovedTransaction.item_name],
            ['Quantity:', `${currentApprovedTransaction.quantity} ${currentApprovedTransaction.unit || 'pcs'}`]
        ];
        
        if (currentApprovedTransaction.supplier_name) {
            itemInfo.push(['Supplier:', currentApprovedTransaction.supplier_name]);
        }
        
        if (currentApprovedTransaction.recipient_name) {
            itemInfo.push(['Recipient:', currentApprovedTransaction.recipient_name]);
            if (currentApprovedTransaction.recipient_address) {
                itemInfo.push(['Address:', currentApprovedTransaction.recipient_address]);
            }
        }
        
        itemInfo.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            
            const maxWidth = 110;
            const lines = doc.splitTextToSize(String(value || '-'), maxWidth);
            doc.text(lines, 70, y);
            y += (lines.length * 6);
        });
        
        // ========================================
        // QR CODE
        // ========================================
        y += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DIGITAL VERIFICATION', 20, y);
        
        y += 5;
        const qrData = generateCompactQRData(currentApprovedTransaction);
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);
        
        await new Promise((resolve) => {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: qrData,
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                setTimeout(() => {
                    const qrImage = qrContainer.querySelector('img');
                    if (qrImage) {
                        doc.addImage(qrImage.src, 'PNG', 20, y, 40, 40);
                    }
                    document.body.removeChild(qrContainer);
                    resolve();
                }, 100);
            } else {
                document.body.removeChild(qrContainer);
                resolve();
            }
        });
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Scan untuk verifikasi keaslian dokumen', 20, y + 45);
        
        if (currentApprovedTransaction.nota_hash) {
             doc.setFontSize(7);
             doc.setFont('courier', 'normal');
             doc.text(`Hash: ${currentApprovedTransaction.nota_hash.substring(0, 50)}...`, 20, y + 50);
        }

        // Footer
        const footerY = 280;
        doc.setLineWidth(0.3);
        doc.line(20, footerY, 190, footerY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by SWIMS - Secure Warehouse Inventory Management System', 105, footerY + 5, { align: 'center' });
        doc.text(`Generated at: ${new Date().toLocaleString('id-ID')}`, 105, footerY + 9, { align: 'center' });
        
        const filename = `NOTA_${currentApprovedTransaction.transaction_code}_${Date.now()}.pdf`;
        doc.save(filename);
        
        closeApprovalSuccessModal();
        
        showMessageModal(
            '✅ PDF Generated!',
            `Nota PDF <strong>${filename}</strong> berhasil didownload.<br><br><span class="small">File tersimpan di folder Downloads browser Anda.</span>`,
            false
        );
        
    } catch (error) {
        console.error('❌ PDF generation error:', error);
        showMessageModal('❌ Error', `Gagal generate PDF: ${error.message}`, false);
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// HELPER: Generate Compact QR Data
// ========================================
function generateCompactQRData(transaction) {
    const hash = transaction.nota_hash ? transaction.nota_hash.substring(0, 16) : 'NOHASH';
    return `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|${hash}`;
}

// ========================================
// CLOSE APPROVAL SUCCESS MODAL
// ========================================
function closeApprovalSuccessModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentApprovedTransaction = null;
}

// ========================================
// FILTER & UTILS
// ========================================

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

console.log('✅ Approval Module Loaded with PDF Support (XSS Protected)');