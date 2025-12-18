/**
 * =========================================================
 * APPROVAL.JS - FIXED VERSION (IDENTICAL PDF OUTPUT)
 * Fitur: Approval + PDF Instant (Pixel-Perfect Match with History)
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
            <h2> Approval Klien/Supplier Baru</h2>
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
                    <p style="font-size:3rem; margin:0;"></p>
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
                    <button class="btn success btn-sm" onclick="handleApprovalAction('approve_transaction', ${t.id})"> Approve</button>
                    <button class="btn danger btn-sm" onclick="handleApprovalAction('reject_transaction', ${t.id})"> Reject</button>
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
                        // Simpan data transaksi yang baru di-approve untuk PDF
                        currentApprovedTransaction = data.data.transaction;
                        
                        console.log('✅ Approved Data:', currentApprovedTransaction);
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
    
    const modalContent = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">✅</div>
            <h3 style="color:var(--success); margin:0 0 10px 0;">Transaksi Berhasil Di-Approve!</h3>
            
            ${hasHash ? `
                <div style="background:#dcfce7; padding:12px; border-radius:8px; margin:15px 0; border-left:4px solid var(--success);">
                    <h4 style="margin:0 0 8px 0; color:#166534;">🔐 Digital Signature Generated</h4>
                    <p class="small" style="margin:0; color:#166534;">
                        Dokumen telah ditandatangani secara digital & aman.
                    </p>
                </div>
            ` : ''}
            
            <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin:20px 0; text-align:left;">
                <h4 style="margin:0 0 10px 0; color:#1e40af;">📋 Detail: ${safe.transaction_code}</h4>
                <p>Silakan download Nota PDF sebagai arsip bukti persetujuan.</p>
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
// GENERATE PDF (PIXEL PERFECT MATCH)
// ========================================
async function downloadApprovedNotaPDF() {
    if (!currentApprovedTransaction) return;
    
    // Coba pakai modul shared jika ada
    if (typeof window.generateSecureNotaPDF === 'function') {
        console.log("Using shared PDF generator");
        window.generateSecureNotaPDF(
            currentApprovedTransaction,
            (result) => {
                closeApprovalSuccessModal();
                showMessageModal('✅ PDF Generated', `Nota ${result.filename} berhasil didownload.`, false);
            }
        );
        return;
    }
    
    // FALLBACK MANUAL (TAPI DIBUAT SAMA PERSIS)
    console.log("Using manual PDF generator (Fallback)");
    showLoadingModal('Generating PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const trx = currentApprovedTransaction; // Shortcut
        
        // 1. HEADER
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('SWIMS - NOTA TRANSAKSI', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Secure Warehouse Inventory Management System', 105, 27, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(20, 32, 190, 32);
        
        // 2. SECURITY BADGE (Hijau di Atas) - Sama seperti History
        let y = 40;
        if (trx.nota_hash) {
            doc.setFillColor(16, 185, 129); // Green
            doc.rect(20, y, 170, 8, 'F');
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('🔐 PROTECTED BY DIGITAL SIGNATURE', 105, y + 5.5, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            y += 12;
        } else {
            y += 2;
        }
        
        // 3. TRANSACTION INFO
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TRANSACTION INFORMATION', 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        // Format Tanggal
        const reqDate = trx.request_date ? new Date(trx.request_date).toLocaleString('id-ID') : '-';
        const appDate = trx.approval_date || new Date().toLocaleString('id-ID'); // Pakai now jika null
        
        const info = [
            ['Transaction Code:', trx.transaction_code],
            ['Type:', trx.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'],
            ['Status:', 'APPROVED'],
            ['Request Date:', reqDate],   // ✅ SUDAH ADA
            ['Approval Date:', appDate],  // ✅ SUDAH ADA
            ['Requester:', trx.requester_name || trx.requester || '-'],
            ['Approver:', trx.approver_name || trx.approver || 'System']
        ];
        
        info.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value), 70, y);
            y += 6;
        });
        
        // 4. ITEM DETAILS
        y += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('ITEM DETAILS', 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const itemInfo = [
            ['SKU:', trx.sku],
            ['Item Name:', trx.item_name],
            ['Quantity:', `${trx.quantity} ${trx.unit || 'pcs'}`]
        ];
        
        // Supplier / Recipient
        if (trx.supplier_name) itemInfo.push(['Supplier:', trx.supplier_name]);
        if (trx.recipient_name) {
            itemInfo.push(['Recipient:', trx.recipient_name]);
            if (trx.recipient_address) {
                const lines = doc.splitTextToSize(trx.recipient_address, 110);
                itemInfo.push(['Address:', lines.join(' ')]); 
            }
        }
        if (trx.note) itemInfo.push(['Notes:', trx.note]); // ✅ NOTE SUDAH MASUK
        
        itemInfo.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(String(value || '-'), 110);
            doc.text(lines, 70, y);
            y += (lines.length * 6);
        });
        
        // 5. DIGITAL SIGNATURE BOX (Biru di Bawah)
        if (trx.nota_hash) {
            y += 10;
            doc.setDrawColor(59, 130, 246); // Blue
            doc.setLineWidth(0.5);
            doc.rect(20, y, 170, 28);
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 64, 175);
            doc.text('🔐 DIGITAL SIGNATURE (SHA-256)', 25, y + 6);
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            
            const hashChunks = trx.nota_hash.match(/.{1,32}/g) || [];
            hashChunks.forEach((chunk, idx) => {
                doc.text(chunk, 25, y + 12 + (idx * 4));
            });
            
            doc.setFontSize(7);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('⚠️ Nota ini dilindungi dengan hash SHA-256. Perubahan data akan terdeteksi.', 25, y + 25);
            doc.setTextColor(0, 0, 0);
            y += 35;
        }
        
        // 6. QR CODE
        y += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('VERIFICATION QR CODE', 20, y);
        y += 5;
        
        const qrData = `SWIMS|${trx.transaction_code}|${trx.type}|${trx.sku}|${trx.quantity}|APPROVED|${trx.nota_hash ? trx.nota_hash.substring(0, 16) : 'NO_HASH'}`;
        
        // QR Generation logic...
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);
        
        await new Promise((resolve) => {
            new QRCode(qrContainer, { text: qrData, width: 128, height: 128 });
            setTimeout(() => {
                const img = qrContainer.querySelector('img');
                if (img) doc.addImage(img.src, 'PNG', 20, y, 40, 40);
                document.body.removeChild(qrContainer);
                resolve();
            }, 100);
        });
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Scan QR code untuk verifikasi', 20, y + 45);
        doc.text('keaslian nota digital', 20, y + 49);
        
        // 7. FOOTER
        const footerY = 280;
        doc.setLineWidth(0.3);
        doc.line(20, footerY, 190, footerY);
        doc.setFont(undefined, 'normal');
        doc.text('Generated by SWIMS - Secure Warehouse Inventory Management System', 105, footerY + 5, { align: 'center' });
        
        if (trx.nota_hash) {
            doc.setFontSize(7);
            doc.text('🔐 This document is protected by digital signature. Any modification will be detected.', 105, footerY + 13, { align: 'center' });
        }
        
        doc.save(`NOTA_${trx.transaction_code}.pdf`);
        closeApprovalSuccessModal();
        showMessageModal('✅ PDF Generated', 'Download berhasil.', false);
        
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