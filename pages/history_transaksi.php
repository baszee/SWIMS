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