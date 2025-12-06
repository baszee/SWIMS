<div class="card">
    <h2>✅ Approval Transaksi Barang</h2>
    <p class="small">Supervisor menyetujui atau menolak permintaan Barang Masuk/Keluar dari Staff. Setelah di-approve, stok akan otomatis diperbarui dan Nota QR Code akan dibuat.</p>
</div>

<!-- Filter Tipe Transaksi -->
<div class="card" style="padding: 12px 20px;">
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <label style="margin:0; font-weight:600;">Filter Tipe:</label>
        <button class="btn primary btn-sm" onclick="filterTransactions('ALL')">Semua</button>
        <button class="btn btn-sm" onclick="filterTransactions('IN')">Barang Masuk</button>
        <button class="btn btn-sm" onclick="filterTransactions('OUT')">Barang Keluar</button>
        <span style="margin-left:auto; color:var(--muted);" id="filterStatus">Menampilkan: <b>Semua</b></span>
    </div>
</div>

<!-- Daftar Transaksi Pending -->
<div id="approvalList">
    <div class="card">
        <p style="text-align:center;">⏳ Memuat daftar transaksi pending...</p>
    </div>
</div>

<!-- Modal QR Code Nota (Muncul setelah approve) -->
<div id="notaModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
    <div class="card" style="max-width:500px; width:90%; text-align:center;">
        <h3 style="color:var(--success);">✅ Transaksi Berhasil Di-Approve!</h3>
        <p class="small">Nota transaksi telah dibuat. QR Code di bawah dapat digunakan untuk verifikasi.</p>
        
        <div id="notaDetails" style="text-align:left; background:#f8fafc; padding:15px; border-radius:6px; margin:15px 0;">
            <!-- Detail nota akan dimuat di sini -->
        </div>
        
        <div id="qrCodeContainer" style="display:flex; justify-content:center; margin:20px 0;">
            <!-- QR Code akan dimuat di sini -->
        </div>
        
        <div style="display:flex; gap:10px; justify-content:center;">
            <button class="btn primary" onclick="closeNotaModal()">Tutup</button>
            <button class="btn success" onclick="downloadNota()">💾 Download Nota</button>
        </div>
    </div>
</div>