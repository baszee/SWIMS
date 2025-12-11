/**
 * =========================================================
 * HISTORY_TRANSAKSI.JS - COMPLETE v2.1 (SCOPE FIX)
 * Features:
 * - PDF Generation with jsPDF
 * - Optimized QR Code (compact signature)
 * - QR Scan verification (mobile-ready)
 * =========================================================
 */

console.log('📋 [HISTORY_TRANSAKSI v2.1] Loading...');

(function() {
    'use strict';

    // ========================================
    // GLOBAL STATE (Scoped to IIFE)
    // ========================================
    let currentNota = null;
    let allTransactionHistory = [];

    // ========================================
    // INIT HISTORY PAGE
    // ========================================
    function init_history_transaksi() {
        console.log('🚀 Init History Transaksi v2.1');
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
            console.log('Nota history data:', data);
            
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
            
            renderNotaTable();
            
        } catch (error) {
            console.error('Load nota history error:', error);
            historyDiv.innerHTML = `
                <div class="card">
                    <p style="color:var(--danger);">Error: ${error.message}</p>
                    <button class="btn primary btn-sm" onclick="loadNotaHistory()">🔄 Coba Lagi</button>
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
                    <h3 style="margin: 0;">📦 Approved Transactions</h3>
                    <p class="small" style="margin: 5px 0 0 0;">Total: <strong>${allTransactionHistory.length}</strong> nota</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="searchNota" placeholder="🔍 Cari kode/item..." 
                           style="max-width: 250px; margin: 0;" oninput="filterNotaTable()">
                    <button class="btn primary btn-sm" onclick="exportNotaList()">📄 Export List</button>
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
    // RENDER NOTA ROW
    // ========================================
    function renderNotaRow(t, index) {
        const notaNumber = `NOTE-${t.id}-${Date.now().toString().slice(-6)}`;
        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in">📦 MASUK</span>' 
            : '<span class="badge badge-out">📤 KELUAR</span>';
        
        // Note: Using window.functionName here to ensure global scope call
        return `
            <tr>
                <td><span class="small">${notaNumber}</span></td>
                <td><strong>${t.transaction_code}</strong></td>
                <td>${typeBadge}</td>
                <td>
                    <strong>${t.item_name}</strong><br>
                    <span class="small">(${t.sku})</span>
                </td>
                <td><strong>${t.quantity}</strong> ${t.unit || 'pcs'}</td>
                <td class="small">${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                <td>
                    <button class="btn primary btn-sm" onclick='window.viewNotaDetail(${JSON.stringify(t).replace(/'/g, "&#39;")})'>
                        👁️ View
                    </button>
                    <button class="btn success btn-sm" onclick='window.generateNotaPDF(${JSON.stringify(t).replace(/'/g, "&#39;")})'>
                        📄 PDF
                    </button>
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
    // VIEW NOTA DETAIL (MODAL)
    // ========================================
    function viewNotaDetail(transaction) {
        const detailHTML = `
            <div style="text-align: left;">
                <h3 style="margin-top: 0; color: var(--primary);">📋 Transaction Detail</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600; width: 40%;">Transaction Code:</td>
                        <td style="padding: 8px;"><strong>${transaction.transaction_code}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Type:</td>
                        <td style="padding: 8px;">
                            <span class="badge ${transaction.type === 'IN' ? 'badge-in' : 'badge-out'}">
                                ${transaction.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'}
                            </span>
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Item:</td>
                        <td style="padding: 8px;">${transaction.item_name} (${transaction.sku})</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Quantity:</td>
                        <td style="padding: 8px;"><strong>${transaction.quantity}</strong> ${transaction.unit || 'pcs'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Requester:</td>
                        <td style="padding: 8px;">${transaction.requester}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Approver:</td>
                        <td style="padding: 8px;">${transaction.approver || 'System'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Approval Date:</td>
                        <td style="padding: 8px;">${transaction.approval_date ? new Date(transaction.approval_date).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                    ${transaction.recipient_name ? `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Recipient:</td>
                        <td style="padding: 8px;">${transaction.recipient_name}<br><span class="small">${transaction.recipient_address || ''}</span></td>
                    </tr>
                    ` : ''}
                    ${transaction.supplier_name ? `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; font-weight: 600;">Supplier:</td>
                        <td style="padding: 8px;">${transaction.supplier_name}</td>
                    </tr>
                    ` : ''}
                    ${transaction.note ? `
                    <tr>
                        <td style="padding: 8px; font-weight: 600;">Notes:</td>
                        <td style="padding: 8px;"><em>${transaction.note}</em></td>
                    </tr>
                    ` : ''}
                </table>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn success" onclick='window.generateNotaPDF(${JSON.stringify(transaction).replace(/'/g, "&#39;")})'>
                        📄 Download PDF Nota
                    </button>
                </div>
            </div>
        `;
        
        showMessageModal('Transaction Detail', detailHTML, false);
    }

    // ========================================
    // GENERATE NOTA PDF (MAIN FUNCTION)
    // ========================================
    async function generateNotaPDF(transaction) {
        console.log('📄 Generating PDF for:', transaction.transaction_code);
        
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
            
            const info = [
                ['Transaction Code:', transaction.transaction_code],
                ['Type:', transaction.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR'],
                ['Status:', 'APPROVED'],
                ['Approval Date:', transaction.approval_date ? new Date(transaction.approval_date).toLocaleString('id-ID') : '-'],
                ['Requester:', transaction.requester],
                ['Approver:', transaction.approver || 'System']
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
                ['SKU:', transaction.sku],
                ['Item Name:', transaction.item_name],
                ['Quantity:', `${transaction.quantity} ${transaction.unit || 'pcs'}`]
            ];
            
            if (transaction.supplier_name) {
                itemInfo.push(['Supplier:', transaction.supplier_name]);
            }
            
            if (transaction.recipient_name) {
                itemInfo.push(['Recipient:', transaction.recipient_name]);
                if (transaction.recipient_address) {
                    itemInfo.push(['Address:', transaction.recipient_address]);
                }
            }
            
            itemInfo.forEach(([label, value]) => {
                doc.setFont(undefined, 'bold');
                doc.text(label, 20, y);
                doc.setFont(undefined, 'normal');
                
                // Handle long text wrapping
                const maxWidth = 110;
                const lines = doc.splitTextToSize(String(value), maxWidth);
                doc.text(lines, 70, y);
                y += (lines.length * 6);
            });
            
            // ========================================
            // QR CODE (OPTIMIZED)
            // ========================================
            y += 10;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('VERIFICATION QR CODE', 20, y);
            
            y += 5;
            
            // Generate compact QR data
            const qrData = generateCompactQRData(transaction);
            console.log('QR Data:', qrData);
            
            // Generate QR Code using QRCode.js
            const qrContainer = document.createElement('div');
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);
            
            // Wait for QR code to be generated
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
            const filename = `NOTA_${transaction.transaction_code}_${Date.now()}.pdf`;
            doc.save(filename);
            
            console.log('✅ PDF generated:', filename);
            
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
    // GENERATE COMPACT QR DATA
    // ========================================
    function generateCompactQRData(transaction) {
        // Format: SWIMS|CODE|TYPE|SKU|QTY|STATUS|DATE
        const date = transaction.approval_date 
            ? transaction.approval_date.substring(0, 10).replace(/-/g, '') 
            : new Date().toISOString().substring(0, 10).replace(/-/g, '');
        
        return `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|APPROVED|${date}`;
    }

    // ========================================
    // EXPORT NOTA LIST (CSV)
    // ========================================
    function exportNotaList() {
        if (allTransactionHistory.length === 0) {
            showMessageModal('Info', 'Tidak ada data untuk diekspor.', false);
            return;
        }
        
        let csv = 'Transaction Code,Type,Item,SKU,Quantity,Requester,Approver,Approval Date\n';
        
        allTransactionHistory.forEach(t => {
            const approvalDate = t.approval_date ? new Date(t.approval_date).toLocaleString('id-ID') : '-';
            csv += `"${t.transaction_code}","${t.type}","${t.item_name}","${t.sku}",${t.quantity},"${t.requester}","${t.approver || '-'}","${approvalDate}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showMessageModal('✅ Sukses', 'Transaction history berhasil diekspor!', false);
    }

    // ========================================
    // EXPOSE TO GLOBAL
    // ========================================
    window.init_history_transaksi = init_history_transaksi;
    window.loadNotaHistory = loadNotaHistory;
    window.filterNotaTable = filterNotaTable;
    window.viewNotaDetail = viewNotaDetail;
    window.generateNotaPDF = generateNotaPDF;
    window.exportNotaList = exportNotaList;

    console.log('✅ [HISTORY_TRANSAKSI v2.1] Module loaded');
})();