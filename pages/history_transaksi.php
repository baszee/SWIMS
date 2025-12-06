<!-- FILE: pages/history_transaksi.php - NEW PAGE -->
<div class="card">
    <h2>📋 History Transaksi & Nota</h2>
    <p class="small">Daftar semua transaksi yang sudah approved beserta QR Code untuk verifikasi.</p>
</div>

<!-- Daftar Nota Transaksi (History) -->
<div class="card">
    <h3>📦 Daftar Nota Transaksi</h3>
    <p class="small">Nota dikeluarkan otomatis setelah Supervisor approve transaksi. QR code berisi signature untuk verifikasi.</p>
    
    <div id="notaHistoryList">
        <p style="text-align:center;">⏳ Memuat riwayat nota...</p>
    </div>
</div>

<!-- Verifikasi QR Code Section -->
<div class="card" style="border-left: 4px solid var(--primary);">
    <h3>🔍 Audit Verifikasi Transaksi (Simulasi QR Code)</h3>
    <p class="small">Supervisor dan Owner dapat memverifikasi QR Code Nota di sini.</p>
    <label>Kode Transaksi yang diverifikasi</label>
    <input type="text" id="verifyTxnCode" placeholder="Contoh: BM-20241206-001">
    <button class="btn primary" onclick="verifyTransactionQr()">Verifikasi Nota</button>
    <div id="verificationResult" style="margin-top: 15px; font-weight: 600;"></div>
</div>

<!-- Script logic ada di js/history_transaksi.js -->
<script>
// Debug: Pastikan element ada dan fungsi init tersedia
console.log('pages/history_transaksi.php loaded');
console.log('notaHistoryList element:', document.getElementById('notaHistoryList'));

// Auto-call init jika fungsi sudah tersedia
if (typeof init_history_transaksi === 'function') {
    console.log('Calling init_history_transaksi from page...');
    init_history_transaksi();
} else {
    console.error('init_history_transaksi function not found! Check if history_transaksi.js is loaded.');
}
</script>