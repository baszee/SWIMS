/**
 * =========================================================
 * APPROVAL.JS - FIXED VERSION with PDF Download
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
                        // Store transaction data for PDF generation
                        currentApprovedTransaction = transactionData;
                        
                        // Show success modal with PDF download option
                        showApprovalSuccessModal(transactionData);
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
// SHOW APPROVAL SUCCESS MODAL WITH PDF OPTION
// ========================================
function showApprovalSuccessModal(transaction) {
    const notaNumber = `NOTE-${transaction.id}-${Date.now().toString().slice(-6)}`;
    
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Berhasil Di-Approve!</h3>
            
            <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin:20px 0; text-align:left;">
                <h4 style="margin:0 0 10px 0; color:#1e40af;">📋 Detail Transaksi:</h4>
                <table style="width:100%; font-size:0.9rem;">
                    <tr>
                        <td style="padding:5px 0;"><strong>Kode Transaksi:</strong></td>
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
                    <tr>
                        <td style="padding:5px 0;"><strong>Requester:</strong></td>
                        <td style="padding:5px 0;">${transaction.requester_name}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background:#dcfce7; padding:15px; border-radius:8px; margin:20px 0; border-left:4px solid var(--success);">
                <p style="margin:0; font-weight:600; color:#166534;">
                    💾 Download nota PDF dengan QR code untuk dokumentasi dan verifikasi
                </p>
            </div>
            
            <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
                <button class="btn success" onclick="generateNotaPDFFromApproval()">
                    📄 Download PDF Nota
                </button>
                <button class="btn primary" onclick="closeApprovalSuccessModal()">
                    Tutup
                </button>
            </div>
        </div>
    `;
    
    showMessageModal('Approval Berhasil', modalContent, false);
}

// ========================================
// GENERATE PDF FROM APPROVAL
// ========================================
async function generateNotaPDFFromApproval() {
    if (!currentApprovedTransaction) {
        showMessageModal('Error', 'Data transaksi tidak tersedia', false);
        return;
    }
    
    console.log('📄 Generating PDF for approved transaction:', currentApprovedTransaction.transaction_code);
    
    showLoadingModal('Generating PDF...');
    
    try {
        // Check if jsPDF is available
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
        
        // Horizontal line
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
        
        const approvalDate = new Date().toLocaleString('id-ID');
        const approverName = currentUser()?.username || 'Supervisor';
        
        const info = [
            ['Transaction Code:', currentApprovedTransaction.transaction_code],
            ['Type:', currentApprovedTransaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR'],
            ['Status:', 'APPROVED'],
            ['Approval Date:', approvalDate],
            ['Requester:', currentApprovedTransaction.requester_name],
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
            const lines = doc.splitTextToSize(String(value), maxWidth);
            doc.text(lines, 70, y);
            y += (lines.length * 6);
        });
        
        // ========================================
        // QR CODE
        // ========================================
        y += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('VERIFICATION QR CODE', 20, y);
        
        y += 5;
        
        // Generate compact QR data
        const qrData = generateCompactQRData(currentApprovedTransaction);
        console.log('QR Data:', qrData);
        
        // Generate QR Code
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
                console.warn('QRCode.js not available');
                document.body.removeChild(qrContainer);
                resolve();
            }
        });
        
        // QR Code info
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Scan QR code untuk verifikasi', 20, y + 45);
        doc.text('digital signature nota', 20, y + 49);
        
        // ========================================
        // FOOTER
        // ========================================
        const footerY = 280;
        doc.setLineWidth(0.3);
        doc.line(20, footerY, 190, footerY);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Generated by SWIMS - Secure Warehouse Inventory Management System', 105, footerY + 5, { align: 'center' });
        doc.text(`Generated at: ${new Date().toLocaleString('id-ID')}`, 105, footerY + 9, { align: 'center' });
        doc.text('This is a computer-generated document. No signature required.', 105, footerY + 13, { align: 'center' });
        
        // ========================================
        // SAVE PDF
        // ========================================
        const filename = `NOTA_${currentApprovedTransaction.transaction_code}_${Date.now()}.pdf`;
        doc.save(filename);
        
        console.log('✅ PDF generated:', filename);
        
        // Close the approval success modal
        closeApprovalSuccessModal();
        
        showMessageModal(
            '✅ PDF Generated!',
            `Nota PDF <strong>${filename}</strong> berhasil didownload.<br><br>
            <span class="small">File tersimpan di folder Downloads browser Anda.</span>`,
            false
        );
        
    } catch (error) {
        console.error('❌ PDF generation error:', error);
        showMessageModal(
            '❌ Error',
            `Gagal generate PDF: ${error.message}<br><br>
            <span class="small">Pastikan library jsPDF dan QRCode.js sudah ter-load.</span>`,
            false
        );
    } finally {
        hideLoadingModal();
    }
}

// ========================================
// HELPER: Generate Compact QR Data
// ========================================
function generateCompactQRData(transaction) {
    const date = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    return `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|APPROVED|${date}`;
}

// ========================================
// CLOSE APPROVAL SUCCESS MODAL
// ========================================
function closeApprovalSuccessModal() {
    // Find and close the custom modal
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear stored transaction
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
    
    document.getElementById('filterStatus').innerHTML = `Menampilkan: <b>${type}</b>`;
    
    let filtered = allTransactions;
    if (type !== 'ALL') filtered = allTransactions.filter(t => t.type === type);
    renderTransactionList(filtered);
}

// ========================================
// LEGACY NOTA MODAL (Keep for compatibility)
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
window.generateNotaPDFFromApproval = generateNotaPDFFromApproval;
window.closeApprovalSuccessModal = closeApprovalSuccessModal;
window.closeNotaModal = closeNotaModal;

console.log('✅ Approval Module Loaded with PDF Support');