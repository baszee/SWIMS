/**
 * =========================================================
 * HISTORY_TRANSAKSI.JS - MODERN DESIGN & SAFE TERMS
 * Features:
 * - PDF Generation with Cryptographic Hash Seal
 * - Modern PDF Layout
 * - XSS Protection
 * =========================================================
 */

console.log('📋 [HISTORY_TRANSAKSI v4.5] Loading SECURE & XSS PROTECTED version...');

(function() {
    'use strict';
    
    let allTransactionHistory = [];

    // ========================================
    // INIT HISTORY PAGE
    // ========================================
    function init_history_transaksi() {
        console.log('🚀 Init History Transaksi v4.5');
        loadNotaHistory();
    }

    // ========================================
    // LOAD NOTA HISTORY
    // ========================================
    async function loadNotaHistory() {
        const historyDiv = document.getElementById('notaHistoryList');
        if (!historyDiv) {
            console.error('notaHistoryList div not found!');
            return;
        }
        
        historyDiv.innerHTML = '<p style="text-align:center;">⏳ Memuat riwayat...</p>';
        
        try {
            console.log('Fetching nota history...');
            const response = await fetch('api/report.php?action=history');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success || data.data.length === 0) {
                historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Tidak ada nota transaksi yang sudah approved.</p>';
                return;
            }
            
            // Filter hanya APPROVED
            allTransactionHistory = data.data.filter(t => t.status === 'APPROVED');
            
            if (allTransactionHistory.length === 0) {
                historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Belum ada transaksi yang approved.</p>';
                return;
            }
            
            console.log(`✅ Loaded ${allTransactionHistory.length} approved transactions`);
            renderNotaTable();
            
        } catch (error) {
            console.error('Load nota history error:', error);
            historyDiv.innerHTML = `
                <div class="card">
                    <p style="color:var(--danger);">❌ Error: ${error.message}</p>
                    <button class="btn primary btn-sm" onclick="window.loadNotaHistory()"> Coba Lagi</button>
                </div>
            `;
        }
    }

    // ========================================
    // RENDER NOTA TABLE
    // ========================================
    function renderNotaTable() {
        const historyDiv = document.getElementById('notaHistoryList');
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0;"> Approved Transactions</h3>
                    <p class="small" style="margin: 5px 0 0 0;">
                        Total: <strong>${allTransactionHistory.length}</strong> nota
                        ${(() => {
                            const withHash = allTransactionHistory.filter(t => t.nota_hash).length;
                            const noHash = allTransactionHistory.length - withHash;
                            return ` (🔐 ${withHash} secured, ⚠️ ${noHash} legacy)`;
                        })()}
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="searchNota" placeholder="🔍 Cari kode/item..." 
                           style="max-width: 250px; margin: 0;" oninput="window.filterNotaTable()">
                    <button class="btn primary btn-sm" onclick="window.exportNotaList()">📄 Export List</button>
                </div>
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>No Nota</th>
                        <th>Kode Trans</th>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Approval Date</th>
                        <th>Security</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="notaTableBody">
        `;
        
        allTransactionHistory.forEach((t, index) => {
            html += renderNotaRow(t, index);
        });
        
        html += '</tbody></table>';
        historyDiv.innerHTML = html;
    }

    // ========================================
    // RENDER NOTA ROW (SECURE)
    // ========================================
    function renderNotaRow(t, index) {
        const notaNumber = `NOTE-${t.id}-${Date.now().toString().slice(-6)}`;
        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in"> MASUK</span>' 
            : '<span class="badge badge-out"> KELUAR</span>';
        
        // REVISI ISTILAH AMAN
        const signatureBadge = t.nota_hash 
            ? '<span class="badge" style="background:#10b981; color:white;">🔐 Sealed</span>'
            : '<span class="badge" style="background:#f59e0b; color:white;">⚠️ Legacy</span>';
        
        const safeTransactionCode = SecurityUtils.escapeHtml(t.transaction_code);
        const safeItemName = SecurityUtils.escapeHtml(t.item_name);
        const safeSku = SecurityUtils.escapeHtml(t.sku);
        const safeUnit = SecurityUtils.escapeHtml(t.unit || 'pcs');
        const safeQuantity = SecurityUtils.escapeHtml(t.quantity); 

        return `
            <tr>
                <td><span class="small">${notaNumber}</span></td>
                <td><strong>${safeTransactionCode}</strong></td>
                <td>${typeBadge}</td>
                <td>
                    <strong>${safeItemName}</strong><br>
                    <span class="small">(${safeSku})</span>
                </td>
                <td><strong>${safeQuantity}</strong> ${safeUnit}</td>
                <td class="small">${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                <td>${signatureBadge}</td>
                <td>
                    <button class="btn primary btn-sm" onclick='window.viewNotaDetail(${JSON.stringify(t).replace(/'/g, "&#39;")})'>
                         View
                    </button>
                    <button class="btn success btn-sm" onclick='window.generateNotaPDF(${JSON.stringify(t).replace(/'/g, "&#39;")})'>
                         PDF
                    </button>
                    ${t.nota_hash ? `
                        <button class="btn btn-sm" style="background:#8b5cf6; color:white;" onclick='window.verifyNotaHash("${safeTransactionCode}")'>
                             Verify
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    // ========================================
    // FILTER NOTA TABLE
    // ========================================
    function filterNotaTable() {
        const searchInput = document.getElementById('searchNota');
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        const tbody = document.getElementById('notaTableBody');
        
        if (!tbody) return;
        
        if (!query) {
            tbody.innerHTML = allTransactionHistory.map((t, i) => renderNotaRow(t, i)).join('');
            return;
        }
        
        const filtered = allTransactionHistory.filter(t => 
            t.transaction_code.toLowerCase().includes(query) ||
            t.item_name.toLowerCase().includes(query) ||
            t.sku.toLowerCase().includes(query)
        );
        
        tbody.innerHTML = filtered.map((t, i) => renderNotaRow(t, i)).join('');
    }

    // ========================================
    // VIEW NOTA DETAIL (SECURE)
    // ========================================
    function viewNotaDetail(transaction) {
        const safe = SecurityUtils.sanitizeObject(transaction);
        
        const detailHTML = `
            <div style="text-align: left;">
                <h3 style="margin-top: 0; color: var(--primary);">📋 Transaction Detail</h3>
                
                ${safe.nota_hash ? `
                    <div style="background:#dcfce7; padding:12px; border-radius:6px; margin:10px 0; border-left:4px solid var(--success);">
                        <h4 style="margin:0 0 8px 0; color:#166534;">🔐 Cryptographic Integrity Seal</h4>
                        <code style="font-size:0.75rem; word-break:break-all; display:block; background:#fff; padding:8px; border-radius:4px;">
                            ${safe.nota_hash}
                        </code>
                        <p class="small" style="margin-top:5px; color:#166534;">(SHA-256 Hash Generated)</p>
                    </div>
                ` : `
                    <div style="background:#fef3c7; padding:12px; border-radius:6px; margin:10px 0; border-left:4px solid #f59e0b;">
                        <p style="margin:0; color:#92400e; font-size:0.9rem;">
                            ⚠️ Transaksi legacy (approved sebelum sistem hash diterapkan)
                        </p>
                    </div>
                `}
                
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600; width: 40%;">Transaction Code:</td>
                        <td style="padding: 8px;"><strong>${safe.transaction_code}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Type:</td>
                        <td style="padding: 8px;">
                            <span class="badge ${safe.type === 'IN' ? 'badge-in' : 'badge-out'}">
                                ${safe.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'}
                            </span>
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Item:</td>
                        <td style="padding: 8px;">${safe.item_name} (${safe.sku})</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Quantity:</td>
                        <td style="padding: 8px;"><strong>${safe.quantity}</strong> ${safe.unit || 'pcs'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Requester:</td>
                        <td style="padding: 8px;">${safe.requester || '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Approver:</td>
                        <td style="padding: 8px;">${safe.approver || 'System'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Approval Date:</td>
                        <td style="padding: 8px;">${safe.approval_date ? new Date(safe.approval_date).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                    ${safe.recipient_name ? `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Recipient:</td>
                        <td style="padding: 8px;">${safe.recipient_name}<br><span class="small">${safe.recipient_address || ''}</span></td>
                    </tr>
                    ` : ''}
                    ${safe.supplier_name ? `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Supplier:</td>
                        <td style="padding: 8px;">${safe.supplier_name}</td>
                    </tr>
                    ` : ''}
                    ${safe.note ? `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Note:</td>
                        <td style="padding: 8px;"><em>${safe.note}</em></td>
                    </tr>
                    ` : ''}
                </table>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn success" onclick='window.generateNotaPDF(${JSON.stringify(transaction).replace(/'/g, "&#39;")})'>
                        📄 Download Nota Resmi
                    </button>
                </div>
            </div>
        `;
        
        if (typeof showMessageModal === 'function') {
            showMessageModal('Transaction Detail', detailHTML, false);
        }
    }

    // ========================================
    // GENERATE PDF (MODERN & SAFE TERMS)
    // ========================================
    function generateNotaPDF(transaction) {
        // Langsung generate manual dengan desain baru (tanpa dependensi shared file jika mau aman)
        // atau panggil fungsi yang sama persis seperti di approval.js
        
        console.log("Generating Modern PDF...");
        // showLoadingModal('Mencetak Nota...'); // Uncomment if using loading modal
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const trx = transaction;
            
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
            const appDate = trx.approval_date ? new Date(trx.approval_date).toLocaleDateString('id-ID') : '-';
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
            
            // Wait for QR to generate
            setTimeout(() => {
                new QRCode(qrContainer, { text: qrData, width: 100, height: 100 });
                // Small delay to ensure render
                setTimeout(() => {
                    const img = qrContainer.querySelector('img');
                    if (img) {
                        // Add QR Code at bottom right
                        doc.addImage(img.src, 'PNG', 160, 250, 30, 30);
                        doc.setFontSize(6);
                        doc.text('Scan to Verify', 175, 283, { align: 'center' });
                    }
                    document.body.removeChild(qrContainer);
                    
                    // 6. FOOTER
                    const footerY = 290;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text('Generated by SWIMS System', 15, footerY);
                    doc.text(`Page 1 of 1`, 195, footerY, { align: 'right' });
                    
                    // Save
                    doc.save(`NOTA_${trx.transaction_code}.pdf`);
                    
                    if (typeof showMessageModal === 'function') {
                        showMessageModal('✅ PDF Generated', 'Nota berhasil didownload.', false);
                    }
                }, 100);
            }, 50);
            
        } catch (e) {
            console.error(e);
            if (typeof showMessageModal === 'function') {
                showMessageModal('Error', e.message, false);
            }
        }
    }

    // ========================================
    // VERIFY NOTA HASH (SECURE FORENSIC CHECK)
    // ========================================
    async function verifyNotaHash(transactionCode) {
        if (typeof showMessageModal === 'function') {
            showMessageModal('Verifikasi', '⏳ Melakukan Audit Forensik...', false);
        }
        
        try {
            const response = await fetch(`api/verify.php?code=${transactionCode}`);
            const result = await response.json();
            
            console.log('🔍 Verify result:', result);
            
            if (result.status === 'VALID') {
                showMessageModal('✅ DATA VALID', 
                    `<div style="text-align:left;">
                        <p><strong>Kode:</strong> ${result.data.transaction_code}</p>
                        <p><strong>Qty:</strong> ${result.data.quantity}</p>
                        <div style="background:#dcfce7; padding:10px; border-radius:6px; color:#166534; margin:10px 0;">
                            ✅ <strong>Integritas data terjamin.</strong><br>
                            Data di database cocok dengan Snapshot Digital. Tidak ada manipulasi.
                        </div>
                        <p class="small">Hash Signature: <code>${result.data.hash}</code></p>
                    </div>`, false);
            } 
            else if (result.status === 'INVALID') {
                // Tampilkan Laporan Forensik
                let reportHTML = '<ul style="color:#7f1d1d; padding-left:20px; text-align:left;">';
                if (result.data.forensic_report && result.data.forensic_report.length > 0) {
                    result.data.forensic_report.forEach(item => reportHTML += `<li>${item}</li>`);
                } else {
                    reportHTML += '<li>Perubahan terdeteksi namun detail tidak spesifik.</li>';
                }
                reportHTML += '</ul>';

                showMessageModal('🚨 PERINGATAN BAHAYA!', 
                    `<div style="text-align:left;">
                        <p><strong>Kode:</strong> ${result.data.transaction_code}</p>
                        <div style="background:#fee2e2; padding:10px; border-radius:6px; border-left:4px solid #ef4444; margin:10px 0;">
                            <h4 style="margin:0; color:#991b1b;">❌ TAMPERING DETECTED!</h4>
                            <p style="color:#7f1d1d; margin-bottom:10px;">Sistem mendeteksi manipulasi data (perbedaan antara Database vs Snapshot).</p>
                            <hr style="border-top:1px solid #fca5a5;">
                            <strong>🔍 Laporan Forensik:</strong>
                            ${reportHTML}
                        </div>
                        <p class="small text-muted">Silakan cek File Log Server jika Snapshot juga rusak.</p>
                    </div>`, false);
            }
            else {
                showMessageModal('Info', result.message, false);
            }
        } catch (error) {
            console.error(error);
            showMessageModal('Error', 'Gagal verifikasi: ' + error.message, false);
        }
    }

    // ========================================
    // EXPORT NOTA LIST (CSV)
    // ========================================
    function exportNotaList() {
        if (allTransactionHistory.length === 0) {
            if (typeof showMessageModal === 'function') showMessageModal('Info', 'Tidak ada data.', false);
            return;
        }
        
        let csv = 'Transaction Code,Type,Item,SKU,Quantity,Requester,Approver,Approval Date,Has Signature\n';
        
        allTransactionHistory.forEach(t => {
            const approvalDate = t.approval_date ? new Date(t.approval_date).toLocaleString('id-ID') : '-';
            const hasSignature = t.nota_hash ? 'Yes' : 'No';
            csv += `"${t.transaction_code}","${t.type}","${t.item_name}","${t.sku}",${t.quantity},"${t.requester || '-'}","${t.approver || '-'}","${approvalDate}","${hasSignature}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        if (typeof showMessageModal === 'function') showMessageModal('✅ Sukses', 'Berhasil diekspor!', false);
    }

    // ========================================
    // EXPOSE TO GLOBAL
    // ========================================
    window.init_history_transaksi = init_history_transaksi;
    window.loadNotaHistory = loadNotaHistory;
    window.filterNotaTable = filterNotaTable;
    window.viewNotaDetail = viewNotaDetail;
    window.generateNotaPDF = generateNotaPDF;
    window.verifyNotaHash = verifyNotaHash;
    window.exportNotaList = exportNotaList;

    console.log('✅ [HISTORY_TRANSAKSI v4.5] Module loaded SECURE & XSS PROTECTED');
})();