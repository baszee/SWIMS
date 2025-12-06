<!-- FILE: pages/notes.php - SIMPLIFIED VERSION -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>📝 Daftar Catatan Internal</h2>
        <button class="btn success" onclick="showNoteForm()">+ Buat Catatan</button>
    </div>
    <p class="small">Digunakan untuk komunikasi penting antar Supervisor dan Owner.</p>
</div>

<div id="notesList">
    <!-- Daftar Notes akan dimuat di sini -->
    <div class="card">
        <p style="text-align:center;">⏳ Memuat catatan...</p>
    </div>
</div>

<!-- Daftar Nota Transaksi (History) -->
<div class="card">
    <h3>📋 Daftar Nota Transaksi</h3>
    <p class="small">Nota dikeluarkan otomatis setelah Supervisor approve transaksi. QR code berisi signature untuk verifikasi.</p>
    
    <div id="notaHistoryList">
        <p style="text-align:center;">⏳ Memuat riwayat nota...</p>
    </div>
</div>

<!-- Verifikasi QR Code Section -->
<div class="card" style="border-left: 4px solid var(--primary);">
    <h3>🔍 Audit Verifikasi Transaksi (Simulasi QR Code)</h3>
    <p class="small">Supervisor dapat mengeluarkan Nota Transaksi. Owner/Supervisor dapat memverifikasi QR Code Nota di sini.</p>
    <label>ID Transaksi yang diverifikasi</label>
    <input type="text" id="verifyTxnCode" placeholder="Contoh: BM-20241206-001">
    <button class="btn primary" onclick="verifyTransactionQr()">Verifikasi Nota</button>
    <div id="verificationResult" style="margin-top: 15px; font-weight: 600;"></div>
</div>