/**
 * =========================================================
 * PDF_GENERATOR.JS - FINAL DESIGN v3.0
 * Purpose: Cetak PDF dengan Desain Professional (Blue Header) + Ngrok QR
 * =========================================================
 */

console.log('📄 [PDF_GENERATOR] Loading Professional Design...');

(function() {
    'use strict';
    
    // ========================================
    // ⚠️ KONFIGURASI NGROK
    // ========================================
    const NGROK_CONFIG = {
        USE_NGROK: true,
        // Pastikan URL ini sesuai dengan CMD ngrok kamu
        NGROK_URL: 'https://diego-lighter-danny.ngrok-free.dev', 
        VERIFY_PATH: '/swims/verify_nota.php' 
    };
    
    /**
     * Helper: Get Verification URL
     */
    function getVerificationUrl(transactionCode) {
        let baseUrl;
        if (NGROK_CONFIG.USE_NGROK) {
            if (NGROK_CONFIG.NGROK_URL.includes('YOUR-NGROK-URL')) {
                console.error('❌ NGROK URL belum diset!');
                return '#';
            }
            baseUrl = NGROK_CONFIG.NGROK_URL;
        } else {
            const protocol = window.location.protocol;
            const host = window.location.host;
            const path = window.location.pathname;
            const folder = path.substring(0, path.lastIndexOf('/'));
            baseUrl = `${protocol}//${host}${folder}`;
        }
        return `${baseUrl}${NGROK_CONFIG.VERIFY_PATH}?code=${transactionCode}`;
    }
    
    /**
     * MAIN FUNCTION: Generate PDF
     */
    async function generateSecureNotaPDF(transaction, onSuccess, onError) {
        console.log('📄 Generating PDF (Professional Layout)...', transaction);
        
        try {
            if (!transaction || !transaction.transaction_code) {
                throw new Error('Invalid transaction data');
            }
            
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded!');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const trx = transaction; // Mapping variable biar codingan desain gampang
            
            // --- WARNA ---
            const primaryColor = [30, 58, 138];   // Biru Tua
            const secondaryColor = [71, 85, 105]; // Abu Tua
            const lightGray = [241, 245, 249];    // Abu Muda Background
            
            // ========================================
            // 1. HEADER (Block Biru)
            // ========================================
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('SWIMS', 20, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Secure Warehouse Inventory Management System', 20, 28);
            
            // Judul Kanan
            doc.setFontSize(16);
            doc.text('OFFICIAL RECEIPT', 190, 20, { align: 'right' });
            doc.setFontSize(10);
            doc.text('NOTA TRANSAKSI', 190, 28, { align: 'right' });

            // ========================================
            // 2. INFO GRID (Kotak Abu-abu)
            // ========================================
            doc.setFillColor(...lightGray);
            doc.roundedRect(15, 50, 180, 45, 3, 3, 'F');
            
            let y = 60;
            
            // Kolom Kiri
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

            // Kolom Kanan
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
            
            // Badge APPROVED
            doc.setFillColor(22, 163, 74); // Hijau
            doc.roundedRect(110, y + 25, 25, 6, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text('APPROVED', 122.5, y + 29, { align: 'center' });

            // ========================================
            // 3. TABLE ITEM
            // ========================================
            y = 110;
            doc.setFillColor(51, 65, 85); // Header Tabel Gelap
            doc.rect(15, y, 180, 10, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('ITEM DESCRIPTION', 20, y + 6);
            doc.text('SKU', 120, y + 6);
            doc.text('QUANTITY', 170, y + 6);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            // Isi Tabel
            doc.text(trx.item_name || trx.name, 20, y + 8);
            doc.text(trx.sku, 120, y + 8);
            doc.text(`${trx.quantity} ${trx.unit || 'pcs'}`, 170, y + 8);
            
            doc.setDrawColor(226, 232, 240);
            doc.line(15, y + 12, 195, y + 12);
            y += 15;

            // Info Tambahan (Note/Supplier)
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

            // ========================================
            // 4. HASH SIGNATURE (Kotak Bawah)
            // ========================================
            y = 220; // Posisi Fixed di bawah
            
            if (trx.nota_hash) {
                doc.setDrawColor(...primaryColor);
                doc.setLineWidth(0.5);
                doc.rect(15, y, 180, 25);
                
                doc.setFillColor(...primaryColor);
                doc.rect(15, y, 180, 6, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('courier', 'bold');
                doc.text('CRYPTOGRAPHIC INTEGRITY HASH (SHA-256)', 105, y + 4, { align: 'center' });
                
                doc.setTextColor(0, 0, 0);
                doc.setFont('courier', 'normal');
                doc.setFontSize(8);
                
                const hashChunks = trx.nota_hash.match(/.{1,64}/g) || [];
                hashChunks.forEach((chunk, idx) => {
                    doc.text(chunk, 105, y + 11 + (idx * 4), { align: 'center' });
                });
                
                doc.setFontSize(7);
                doc.setTextColor(...secondaryColor);
                doc.text('This document is electronically sealed. Any modification will invalidate this hash.', 105, y + 22, { align: 'center' });
            }

            // ========================================
            // 5. QR CODE (Pojok Kanan Bawah)
            // ========================================
            
            // 🔴 PENTING: QR Code isinya URL NGROK (Logic tetep jalan)
            const verifyUrl = getVerificationUrl(trx.transaction_code);
            console.log('🔗 QR Code Link:', verifyUrl);
            
            const qrContainer = document.createElement('div');
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);
            
            await new Promise((resolve, reject) => {
                if(typeof QRCode === 'undefined') {
                    console.warn('QRCode lib not loaded');
                    resolve();
                    return;
                }

                new QRCode(qrContainer, {
                    text: verifyUrl, // URL Ngrok masuk sini
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                // Tunggu render
                setTimeout(() => {
                    const img = qrContainer.querySelector('img');
                    if (img) {
                        // Posisi QR di pojok kanan bawah (Matches Approval Design)
                        doc.addImage(img.src, 'PNG', 160, 250, 30, 30);
                        doc.setFontSize(6);
                        doc.setTextColor(0,0,0);
                        doc.text('Scan to Verify', 175, 283, { align: 'center' });
                    }
                    document.body.removeChild(qrContainer);
                    resolve();
                }, 200);
            });

            // ========================================
            // 6. FOOTER
            // ========================================
            const footerY = 290;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Generated by SWIMS System', 15, footerY);
            doc.text(`Page 1 of 1`, 195, footerY, { align: 'right' });
            
            // Simpan File
            const filename = `NOTA_${trx.transaction_code}.pdf`;
            doc.save(filename);
            
            console.log('✅ PDF Generated Successfully');
            
            if (typeof onSuccess === 'function') {
                onSuccess({
                    filename: filename,
                    transaction: trx,
                    has_signature: !!trx.nota_hash,
                    verify_url: verifyUrl
                });
            }

        } catch (error) {
            console.error('❌ PDF generation error:', error);
            if (typeof onError === 'function') onError(error);
        }
    }
    
    // Expose to Window
    window.generateSecureNotaPDF = generateSecureNotaPDF;
    window.NGROK_CONFIG = NGROK_CONFIG;

    console.log('✅ [PDF_GENERATOR] Module Loaded.');
    
})();