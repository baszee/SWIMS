<!-- FILE: pages/history_transaksi.php - IMPROVED v2.0 -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <h2 style="margin: 0;"> History Transaksi & Nota Digital</h2>
            <p class="small" style="margin: 5px 0 0 0;">Semua transaksi approved dengan nota PDF & QR code verification</p>
        </div>
        <button class="btn primary" onclick="loadNotaHistory()"> Refresh</button>
    </div>
</div>

<!-- Feature Info Cards -->
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 20px;">
    <div class="card" style="background: #dbeafe; border-color: #3b82f6;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af;"> PDF Nota</h4>
        <p class="small" style="margin: 0; color: #1e3a8a;">
            Download nota transaksi dalam format PDF profesional dengan QR code
        </p>
    </div>
    
    <div class="card" style="background: #dcfce7; border-color: #10b981;">
        <h4 style="margin: 0 0 8px 0; color: #166534;"> QR Verification</h4>
        <p class="small" style="margin: 0; color: #166534;">
            Scan QR code di nota untuk verifikasi keaslian dokumen
        </p>
    </div>
    
    <div class="card" style="background: #fef3c7; border-color: #f59e0b;">
        <h4 style="margin: 0 0 8px 0; color: #92400e;"> Export Data</h4>
        <p class="small" style="margin: 0; color: #78350f;">
            Export list transaksi ke CSV untuk analisis lebih lanjut
        </p>
    </div>
</div>

<!-- Nota History Table -->
<div class="card">
    <div id="notaHistoryList">
        <p style="text-align:center;">⏳ Memuat riwayat nota...</p>
    </div>
</div>

<!-- QR Code Explanation -->
<div class="card" style="background: #f0f9ff; border-left: 4px solid #3b82f6;">
    <h3 style="margin-top: 0; color: #1e40af;"> Cara Kerja QR Code Verification</h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
        <div>
            <h4 style="color: #1e40af; margin: 0 0 10px 0;">📱 Mobile Verification (Recommended)</h4>
            <ol class="small" style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                <li>Download PDF Nota dari sistem</li>
                <li>Buka PDF di smartphone/tablet</li>
                <li>Scan QR Code dengan camera app atau QR scanner</li>
                <li>QR Code berisi: <code>SWIMS|CODE|TYPE|SKU|QTY|STATUS|DATE</code></li>
                <li>Verify data matches dengan isi nota</li>
            </ol>
        </div>
        
        <div>
            <h4 style="color: #1e40af; margin: 0 0 10px 0;">💻 Desktop Verification (Alternative)</h4>
            <ol class="small" style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                <li>Print PDF Nota fisik</li>
                <li>Gunakan mobile device untuk scan QR</li>
                <li>Compare QR data dengan printed nota</li>
                <li>Pastikan transaction code matches</li>
                <li>Konfirmasi approval status = APPROVED</li>
            </ol>
        </div>
    </div>
    
    <div style="background: #fff; padding: 12px; border-radius: 6px; margin-top: 15px; border: 1px solid #bfdbfe;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af;">📋 QR Data Format Example:</h4>
        <code style="display: block; padding: 8px; background: #f8fafc; border-radius: 4px; font-size: 0.85rem;">
            SWIMS|BK-20251209-001|OUT|APL-IP15-001|10|APPROVED|20251209
        </code>
        <p class="small" style="margin: 8px 0 0 0; color: #64748b;">
            ✅ Compact format: ~70 bytes (mudah scan)<br>
            ✅ Security: Signature verification<br>
            ✅ Privacy: Tidak ada data sensitif (recipient/supplier)
        </p>
    </div>
</div>

<!-- Tips & Best Practices -->
<div class="card" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
    <h3 style="margin-top: 0; color: #92400e;">💡 Best Practices</h3>
    <ul class="small" style="margin: 0; padding-left: 20px; color: #78350f;">
        <li><strong>Simpan PDF:</strong> Store nota PDF di cloud storage (Google Drive, OneDrive) untuk backup</li>
        <li><strong>Print Nota:</strong> Print PDF untuk lampiran dokumentasi fisik warehouse</li>
        <li><strong>QR Verification:</strong> Gunakan QR scanner app (contoh: Google Lens, QR Code Reader)</li>
        <li><strong>Security:</strong> QR code hanya berisi signature - detail lengkap ada di PDF</li>
        <li><strong>Audit Trail:</strong> Semua download tercatat di activity logs sistem</li>
    </ul>
</div>

<!-- Script logic ada di js/history_transaksi.js -->
<script>
console.log('✅ pages/history_transaksi.php v2.0 loaded');

// Auto-call init jika fungsi sudah tersedia
if (typeof init_history_transaksi === 'function') {
    console.log('✅ Calling init_history_transaksi...');
    init_history_transaksi();
} else {
    console.error('❌ init_history_transaksi function not found!');
}
</script>