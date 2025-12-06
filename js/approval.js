/**
 * =========================================================
 * APPROVAL.JS - COMPLETE APPROVAL MODULE
 * Versi: 3.0 - Full Featured dengan QR Code Generator
 * =========================================================
 */

// Global state
let currentTransactionFilter = 'ALL';
let allTransactions = [];
let currentApprovedTransaction = null;

// ========================================
// INIT FUNCTIONS
// ========================================

/* init_approval - Approval Transaksi */
function init_approval() {
    console.log('🚀 Init Approval Transaksi');
    loadApprovalData('transactions');
}

/* init_approval_items - Approval Item/Supplier Baru */
function init_approval_items() {
    console.log('🚀 Init Approval Items');
    const content = document.getElementById('content');
    
    // Render tabs jika belum ada
    if (!document.getElementById('itemApprovalTabs')) {
        content.innerHTML = `
            <div class="card">
                <h2>✅ Approval Item & Klien Baru</h2>
                <p class="small">Supervisor menyetujui Item dan Klien/Supplier yang diajukan Staff agar dapat digunakan dalam transaksi.</p>
            </div>
            <div class="menu" id="itemApprovalTabs">
                <button class="btn primary" onclick="renderItemApprovalContent('items', this)">Item Baru</button>
                <button class="btn" onclick="renderItemApprovalContent('suppliers', this)">Klien/Supplier Baru</button>
            </div>
            <div id="approvalItemsList"></div>
        `;
    }
    renderItemApprovalContent('items', document.querySelector('#itemApprovalTabs button:first-child'));
}

/**
 * Render konten spesifik di halaman approval_items.php
 */
function renderItemApprovalContent(type, element) {
    const tabs = document.getElementById('itemApprovalTabs').querySelectorAll('button');
    tabs.forEach(btn => btn.className = 'btn');
    element.className = 'btn primary';
    
    loadApprovalData(type);
}

// ========================================
// LOAD APPROVAL DATA (Universal)
// ========================================

async function loadApprovalData(type) {
    const listDiv = document.getElementById(type === 'transactions' ? 'approvalList' : 'approvalItemsList');
    if (!listDiv) {
        console.error('Target div not found!');
        return;
    }
    
    listDiv.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Memuat data...</p></div>';
    showLoadingModal('Mengambil data pending...');
    
    try {
        const response = await fetch(`api/approval.php?action=${type}`);
        const data = await response.json();
        
        if (!data.success) {
            listDiv.innerHTML = `<div class="card"><p style="color:var(--danger);">❌ Gagal: ${data.message}</p></div>`;
            return;
        }
        
        if (data.data.length === 0) {
            listDiv.innerHTML = `
                <div class="card" style="text-align:center; padding:40px;">
                    <p style="font-size:3rem; margin:0;">✅</p>
                    <p style="color:var(--success); font-weight:600;">Semua ${type === 'transactions' ? 'transaksi' : type === 'items' ? 'item' : 'supplier'} sudah di-approve!</p>
                    <p class="small">Tidak ada yang pending saat ini.</p>
                </div>
            `;
            return;
        }
        
        // Simpan data untuk filter
        if (type === 'transactions') {
            allTransactions = data.data;
        }
        
        // Render berdasarkan tipe
        if (type === 'transactions') {
            renderTransactionList(data.data);
        } else if (type === 'items') {
            renderItemList(data.data);
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
    html += '<th>Kode Transaksi</th><th>Tipe</th><th>Item (SKU)</th><th>Qty</th><th>Requester</th><th>Tanggal</th><th>Detail</th><th>Aksi</th></tr></thead><tbody>';
    
    transactions.forEach(t => {
        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in" style="background:#dbeafe; color:#1e40af;">📦 MASUK</span>' 
            : '<span class="badge badge-out" style="background:#fce7f3; color:#9f1239;">📤 KELUAR</span>';
        
        // Detail berdasarkan tipe
        let detailInfo = '';
        if (t.type === 'IN') {
            detailInfo = `<span class="small">Supplier: <b>${t.supplier_name || '-'}</b></span>`;
        } else {
            detailInfo = `<span class="small">Penerima: <b>${t.recipient_name || '-'}</b></span>`;
        }
        
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
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_transaction', ${t.id}, ${JSON.stringify(t).replace(/"/g, '&quot;')})">
                        ✅ Approve
                    </button>
                    <button class="btn danger btn-sm" onclick="handleApprovalAction('reject_transaction', ${t.id})">
                        ❌ Reject
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    // Info box
    html += `
        <div class="card" style="background:#fef3c7; border-color:#f59e0b;">
            <h4 style="margin-top:0; color:#92400e;">⚠️ Perhatian</h4>
            <p class="small" style="color:#78350f; margin:0;">
                • <strong>Approve:</strong> Stok akan otomatis diperbarui dan Nota QR Code dibuat<br>
                • <strong>Reject:</strong> Transaksi ditolak dan stok tidak berubah<br>
                • Pastikan periksa detail transaksi sebelum approve!
            </p>
        </div>
    `;
    
    listDiv.innerHTML = html;
}

function renderItemList(items) {
    const listDiv = document.getElementById('approvalItemsList');
    
    let html = '<div class="card"><h3>📦 Item Baru Pending</h3>';
    html += '<table class="table"><thead><tr>';
    html += '<th>SKU</th><th>Nama Item</th><th>Unit</th><th>Supplier</th><th>Requester</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    
    items.forEach(item => {
        html += `
            <tr>
                <td><b>${item.sku}</b></td>
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td>${item.supplier_name}</td>
                <td>${item.requester_name}</td>
                <td>${item.created_at.substring(0, 16)}</td>
                <td>
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_item', ${item.id})">
                        ✅ Approve
                    </button>
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
    html += '<th>Nama Klien/PT</th><th>Kontak Person</th><th>Telepon</th><th>Alamat</th><th>Requester</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    
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
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_supplier', ${s.id})">
                        ✅ Approve
                    </button>
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
    const entityType = action.includes('transaction') ? 'transaksi' : 
                       action.includes('item') ? 'item' : 'supplier';
    
    showMessageModal(
        'Konfirmasi Approval',
        `Yakin ingin <strong>${confirmMsg}</strong> ${entityType} ini?<br><br>
        ${!isApprove ? '<span style="color:var(--danger);">Tindakan ini tidak dapat dibatalkan!</span>' : ''}`,
        true,
        async () => {
            showLoadingModal('Memproses approval...');
            
            try {
                const response = await fetch('api/approval.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ action, id })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Jika approve transaksi, tampilkan modal nota dengan QR
                    if (isApprove && action === 'approve_transaction' && transactionData) {
                        currentApprovedTransaction = transactionData;
                        showNotaModal(transactionData);
                    } else {
                        showMessageModal('✅ Sukses', data.message, false);
                    }
                    
                    // Reload data
                    if (action.includes('transaction')) {
                        loadApprovalData('transactions');
                        // Reload supervisor dashboard stats jika ada
                        if (typeof loadSupervisorStats === 'function') {
                            loadSupervisorStats();
                        }
                    } else if (action.includes('item')) {
                        loadApprovalData('items');
                    } else if (action.includes('supplier')) {
                        loadApprovalData('suppliers');
                    }
                } else {
                    showMessageModal('❌ Gagal', data.message, false);
                }
            } catch (error) {
                showMessageModal('Error', 'Gagal terhubung ke server: ' + error.message, false);
                console.error('Approval action error:', error);
            } finally {
                hideLoadingModal();
            }
        }
    );
}

// ========================================
// FILTER TRANSACTIONS
// ========================================

function filterTransactions(type) {
    currentTransactionFilter = type;
    
    // Update UI filter buttons
    const filterButtons = document.querySelectorAll('.card button[onclick^="filterTransactions"]');
    filterButtons.forEach(btn => {
        btn.className = 'btn btn-sm';
    });
    event.target.className = 'btn primary btn-sm';
    
    // Update status text
    document.getElementById('filterStatus').innerHTML = `Menampilkan: <b>${type === 'ALL' ? 'Semua' : type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}</b>`;
    
    // Filter data
    let filtered = allTransactions;
    if (type !== 'ALL') {
        filtered = allTransactions.filter(t => t.type === type);
    }
    
    renderTransactionList(filtered);
}

// ========================================
// QR CODE & NOTA MODAL
// ========================================

function showNotaModal(transaction) {
    const modal = document.getElementById('notaModal');
    const detailsDiv = document.getElementById('notaDetails');
    const qrContainer = document.getElementById('qrCodeContainer');
    
    // Generate nota number
    const notaNumber = `NOTE-${Date.now()}`;
    
    // Render details
    detailsDiv.innerHTML = `
        <p style="margin:5px 0;"><strong>No Nota:</strong> ${notaNumber}</p>
        <p style="margin:5px 0;"><strong>Kode Transaksi:</strong> ${transaction.transaction_code}</p>
        <p style="margin:5px 0;"><strong>Tipe:</strong> ${transaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR'}</p>
        <p style="margin:5px 0;"><strong>Item:</strong> ${transaction.item_name} (${transaction.sku})</p>
        <p style="margin:5px 0;"><strong>Jumlah:</strong> ${transaction.quantity} ${transaction.unit}</p>
        <p style="margin:5px 0;"><strong>Disetujui oleh:</strong> ${currentUser().username}</p>
        <p style="margin:5px 0;"><strong>Tanggal:</strong> ${new Date().toLocaleString('id-ID')}</p>
    `;
    
    // Generate QR Code
    qrContainer.innerHTML = '<div id="qrcode"></div>';
    
    // Data untuk QR (bisa discan nanti)
    const qrData = `TXN-${transaction.transaction_code}|TYPE-${transaction.type}|STATUS-APPROVED|BY-${currentUser().username}`;
    
    // Generate QR menggunakan library yang sudah di-load di index.php
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('qrcode'), {
            text: qrData,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        qrContainer.innerHTML = '<p style="color:var(--danger);">QR Code library tidak tersedia</p>';
    }
    
    // Tampilkan modal
    modal.style.display = 'flex';
}

function closeNotaModal() {
    document.getElementById('notaModal').style.display = 'none';
    currentApprovedTransaction = null;
}

function downloadNota() {
    if (!currentApprovedTransaction) {
        showMessageModal('Error', 'Data transaksi tidak tersedia', false);
        return;
    }
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        // Fallback ke text file jika jsPDF belum load
        downloadNotaText();
        return;
    }
    
    // Generate PDF menggunakan jsPDF
    generateNotaPDF(currentApprovedTransaction);
}

// ========================================
// PDF GENERATOR (jsPDF)
// ========================================
async function generateNotaPDF(transaction) {
    showLoadingModal('Membuat PDF Nota...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const user = currentUser();
        const notaNumber = `NOTE-${Date.now()}`;
        const now = new Date();
        
        // --- HEADER ---
        doc.setFillColor(37, 99, 235); // Primary blue
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('NOTA TRANSAKSI', 105, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('SWIMS - Secure Warehouse Inventory Management System', 105, 25, { align: 'center' });
        
        // --- INFO NOTA ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('No Nota:', 20, 45);
        doc.setFont(undefined, 'normal');
        doc.text(notaNumber, 50, 45);
        
        doc.setFont(undefined, 'bold');
        doc.text('Tanggal:', 20, 52);
        doc.setFont(undefined, 'normal');
        doc.text(now.toLocaleString('id-ID'), 50, 52);
        
        // --- GARIS PEMBATAS ---
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 58, 190, 58);
        
        // --- DETAIL TRANSAKSI ---
        let yPos = 68;
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('DETAIL TRANSAKSI', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Kode Transaksi:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(transaction.transaction_code, 70, yPos);
        yPos += 7;
        
        doc.setFont(undefined, 'bold');
        doc.text('Tipe:', 20, yPos);
        doc.setFont(undefined, 'normal');
        const tipeText = transaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR';
        doc.text(tipeText, 70, yPos);
        yPos += 7;
        
        doc.setFont(undefined, 'bold');
        doc.text('Status:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(22, 163, 74); // Green
        doc.text('APPROVED', 70, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 12;
        
        // --- DETAIL BARANG ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('DETAIL BARANG', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Nama Item:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(transaction.item_name, 70, yPos);
        yPos += 7;
        
        doc.setFont(undefined, 'bold');
        doc.text('SKU:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(transaction.sku, 70, yPos);
        yPos += 7;
        
        doc.setFont(undefined, 'bold');
        doc.text('Jumlah:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`${transaction.quantity} ${transaction.unit}`, 70, yPos);
        yPos += 12;
        
        // --- INFO APPROVAL ---
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('INFORMASI APPROVAL', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Disetujui oleh:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`${user.username} (Supervisor)`, 70, yPos);
        yPos += 7;
        
        doc.setFont(undefined, 'bold');
        doc.text('Tanggal Approval:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(now.toLocaleString('id-ID'), 70, yPos);
        yPos += 15;
        
        // --- QR CODE ---
        const qrData = `TXN-${transaction.transaction_code}|TYPE-${transaction.type}|STATUS-APPROVED|BY-${user.username}`;
        
        // Create temporary QR
        const tempQrDiv = document.createElement('div');
        tempQrDiv.id = 'tempQrForPdf';
        tempQrDiv.style.position = 'absolute';
        tempQrDiv.style.left = '-9999px';
        document.body.appendChild(tempQrDiv);
        
        const qrCode = new QRCode(tempQrDiv, {
            text: qrData,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Wait for QR generation
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get QR as image
        const qrImg = tempQrDiv.querySelector('img');
        if (qrImg && qrImg.src) {
            doc.addImage(qrImg.src, 'PNG', 145, 68, 40, 40);
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            doc.text('Scan QR untuk verifikasi', 165, 115, { align: 'center' });
        }
        
        // Cleanup
        document.body.removeChild(tempQrDiv);
        
        // --- DIGITAL SIGNATURE ---
        yPos = 200;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, 190, yPos);
        yPos += 8;
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('DIGITAL SIGNATURE', 20, yPos);
        yPos += 5;
        
        doc.setFont(undefined, 'normal');
        const signature = generateDigitalSignature(transaction, user.username);
        doc.text(`Hash: ${signature}`, 20, yPos);
        yPos += 5;
        doc.text(`Verified by SWIMS at ${now.toISOString()}`, 20, yPos);
        
        // --- FOOTER ---
        yPos = 280;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Dokumen ini dibuat secara digital oleh SWIMS', 105, yPos, { align: 'center' });
        doc.text('Secure Warehouse Inventory Management System', 105, yPos + 5, { align: 'center' });
        
        // --- SAVE PDF ---
        doc.save(`Nota_${transaction.transaction_code}_${Date.now()}.pdf`);
        
        hideLoadingModal();
        showMessageModal('✅ PDF Berhasil!', 'Nota PDF berhasil didownload! File sudah ada di folder Downloads Anda.', false);
        
    } catch (error) {
        hideLoadingModal();
        console.error('PDF generation error:', error);
        showMessageModal('Error', 'Gagal membuat PDF. Mencoba download sebagai text file...', false);
        
        // Fallback ke text
        setTimeout(() => downloadNotaText(), 1000);
    }
}

// Generate digital signature (simple hash)
function generateDigitalSignature(transaction, approver) {
    const data = `${transaction.transaction_code}|${transaction.type}|${transaction.item_name}|${transaction.quantity}|${approver}|${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
}

// Fallback: Download as text file
function downloadNotaText() {
// Fallback: Download as text file
function downloadNotaText() {
    const notaNumber = `NOTE-${Date.now()}`;
    const transaction = currentApprovedTransaction;
    const user = currentUser();
    
    const notaContent = `
========================================
        NOTA TRANSAKSI - SWIMS
========================================

No Nota: ${notaNumber}
Kode Transaksi: ${transaction.transaction_code}
Tipe: ${transaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR'}

----------------------------------------
DETAIL BARANG:
----------------------------------------
Item: ${transaction.item_name}
SKU: ${transaction.sku}
Jumlah: ${transaction.quantity} ${transaction.unit}

----------------------------------------
INFORMASI APPROVAL:
----------------------------------------
Disetujui oleh: ${user.username} (Supervisor)
Tanggal: ${new Date().toLocaleString('id-ID')}
Status: APPROVED

----------------------------------------
VERIFIKASI:
----------------------------------------
QR Data: TXN-${transaction.transaction_code}|STATUS-APPROVED
Digital Signature: ${generateDigitalSignature(transaction, user.username)}

========================================
    Dokumen ini dibuat secara digital
    oleh SWIMS (Secure Warehouse IMS)
========================================
    `;
    
    // Create download
    const blob = new Blob([notaContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nota_${transaction.transaction_code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessageModal('✅ Download Sukses', 'Nota berhasil didownload sebagai file text.', false);
}
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================

window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.renderItemApprovalContent = renderItemApprovalContent;
window.loadApprovalData = loadApprovalData;
window.handleApprovalAction = handleApprovalAction;
window.filterTransactions = filterTransactions;
window.closeNotaModal = closeNotaModal;
window.downloadNota = downloadNota;

console.log('✅ Approval Module v3.0 loaded - Full Featured with QR Code!');