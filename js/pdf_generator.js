/**
 * =========================================================
 * PDF_GENERATOR.JS - UNIFIED PDF GENERATOR v1.0
 * Purpose: Single source of truth untuk generate PDF Nota
 * Usage: Dipanggil dari approval.js dan history_transaksi.js
 * =========================================================
 */

console.log('📄 [PDF_GENERATOR] Loading unified module...');

(function() {
    'use strict';
    
    /**
     * Generate PDF Nota dengan Hash Signature
     * @param {Object} transaction - Transaction data object
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    async function generateSecureNotaPDF(transaction, onSuccess, onError) {
        console.log('📄 Generating Secure PDF with signature...', transaction);
        
        try {
            // Validation
            if (!transaction || !transaction.transaction_code) {
                throw new Error('Invalid transaction data');
            }
            
            // Check jsPDF library
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded! Please refresh the page.');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // ========================================
            // PDF HEADER
            // ========================================
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text('SWIMS - NOTA TRANSAKSI', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Secure Warehouse Inventory Management System', 105, 27, { align: 'center' });
            
            // Horizontal line
            doc.setLineWidth(0.5);
            doc.line(20, 32, 190, 32);
            
            // ========================================
            // SECURITY BADGE (if has hash)
            // ========================================
            let y = 40;
            
            if (transaction.nota_hash) {
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
            
            // ========================================
            // TRANSACTION INFO
            // ========================================
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('TRANSACTION INFORMATION', 20, y);
            
            y += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            const approvalDate = transaction.approval_date 
                ? new Date(transaction.approval_date).toLocaleString('id-ID')
                : 'Not approved yet';
            
            const info = [
                ['Transaction Code:', transaction.transaction_code],
                ['Type:', transaction.type === 'IN' ? '📦 BARANG MASUK' : '📤 BARANG KELUAR'],
                ['Status:', transaction.status || 'APPROVED'],
                ['Request Date:', transaction.request_date ? new Date(transaction.request_date).toLocaleString('id-ID') : '-'],
                ['Approval Date:', approvalDate],
                ['Requester:', transaction.requester || transaction.requester_name || '-'],
                ['Approver:', transaction.approver || transaction.approver_name || 'System']
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
                ['Item Name:', transaction.item_name || transaction.name],
                ['Quantity:', `${transaction.quantity} ${transaction.unit || 'pcs'}`]
            ];
            
            // Supplier (for IN transactions)
            if (transaction.supplier_name) {
                itemInfo.push(['Supplier:', transaction.supplier_name]);
            }
            
            // Recipient (for OUT transactions)
            if (transaction.recipient_name) {
                itemInfo.push(['Recipient:', transaction.recipient_name]);
                
                if (transaction.recipient_address) {
                    // Handle multi-line address
                    const maxWidth = 110;
                    const addressLines = doc.splitTextToSize(transaction.recipient_address, maxWidth);
                    itemInfo.push(['Address:', addressLines.join(' ')]);
                }
            }
            
            // Notes (if any)
            if (transaction.note) {
                const maxWidth = 110;
                const noteLines = doc.splitTextToSize(transaction.note, maxWidth);
                itemInfo.push(['Notes:', noteLines.join(' ')]);
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
            // DIGITAL SIGNATURE SECTION
            // ========================================
            if (transaction.nota_hash) {
                y += 10;
                
                // Draw signature box
                doc.setDrawColor(59, 130, 246); // Blue
                doc.setLineWidth(0.5);
                doc.rect(20, y, 170, 28);
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(30, 64, 175); // Dark blue
                doc.text('🔐 DIGITAL SIGNATURE (SHA-256)', 25, y + 6);
                
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                
                // Split hash into chunks for better readability
                const hashChunks = transaction.nota_hash.match(/.{1,32}/g) || [];
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
            
            // ========================================
            // QR CODE
            // ========================================
            y += 5;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('VERIFICATION QR CODE', 20, y);
            
            y += 5;
            
            // Generate QR data dengan hash signature
            const qrData = transaction.nota_hash
                ? `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|APPROVED|${transaction.nota_hash.substring(0, 16)}`
                : `SWIMS|${transaction.transaction_code}|${transaction.type}|${transaction.sku}|${transaction.quantity}|APPROVED|NO_HASH`;
            
            console.log('📱 QR Data:', qrData);
            
            // Generate QR Code using QRCode.js
            const qrContainer = document.createElement('div');
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);
            
            await new Promise((resolve, reject) => {
                if (typeof QRCode !== 'undefined') {
                    try {
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
                                console.log('✅ QR Code added to PDF');
                            }
                            document.body.removeChild(qrContainer);
                            resolve();
                        }, 200);
                    } catch (err) {
                        document.body.removeChild(qrContainer);
                        console.error('QR generation error:', err);
                        reject(err);
                    }
                } else {
                    console.warn('⚠️ QRCode.js not available');
                    document.body.removeChild(qrContainer);
                    resolve();
                }
            });
            
            // QR Code info
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Scan QR code untuk verifikasi', 20, y + 45);
            doc.text('keaslian nota digital', 20, y + 49);
            doc.setTextColor(0, 0, 0);
            
            // ========================================
            // FOOTER
            // ========================================
            const footerY = 280;
            doc.setLineWidth(0.3);
            doc.line(20, footerY, 190, footerY);
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('Generated by SWIMS - Secure Warehouse Inventory Management System', 105, footerY + 5, { align: 'center' });
            doc.text(`Generated at: ${new Date().toLocaleString('id-ID')}`, 105, footerY + 9, { align: 'center' });
            
            if (transaction.nota_hash) {
                doc.setFontSize(7);
                doc.text('🔐 This document is protected by digital signature. Any modification will be detected.', 105, footerY + 13, { align: 'center' });
            } else {
                doc.text('This is a computer-generated document. No signature required.', 105, footerY + 13, { align: 'center' });
            }
            
            doc.setTextColor(0, 0, 0);
            
            // ========================================
            // SAVE PDF
            // ========================================
            const timestamp = new Date().getTime();
            const filename = `NOTA_${transaction.transaction_code}_${timestamp}.pdf`;
            
            doc.save(filename);
            
            console.log('✅ PDF generated successfully:', filename);
            
            // Success callback
            if (typeof onSuccess === 'function') {
                onSuccess({
                    filename: filename,
                    transaction: transaction,
                    has_signature: !!transaction.nota_hash
                });
            }
            
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            
            // Error callback
            if (typeof onError === 'function') {
                onError(error);
            } else {
                if (typeof showMessageModal === 'function') {
                    showMessageModal(
                        '❌ Error',
                        `Gagal generate PDF: ${error.message}<br><br>
                        <span class="small">Pastikan library jsPDF dan QRCode.js sudah ter-load dengan benar.</span>`,
                        false
                    );
                } else {
                    alert('Error generating PDF: ' + error.message);
                }
            }
        }
    }
    
    // ========================================
    // EXPOSE TO GLOBAL
    // ========================================
    window.generateSecureNotaPDF = generateSecureNotaPDF;
    
    console.log('✅ [PDF_GENERATOR] Module loaded');
    
})();