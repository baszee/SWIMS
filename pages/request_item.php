<!-- ============================================================================
FILE: pages/request_item.php - CLEAN VERSION (NO INLINE SCRIPT)
============================================================================ -->

<div class="card">
    <h2> Request Klien/Supplier Baru</h2>
    <p class="small">Jika Klien/PT pemilik barang belum terdaftar di sistem, ajukan pendaftarannya di sini.</p>
</div>

<!-- DEBUG PANEL -->
<div id="debugPanel" class="card" style="background:#1e293b; color:#f1f5f9; display:none;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h4 style="margin:0; color:#38bdf8;">🔍 DEBUG LOG</h4>
        <button class="btn btn-sm" style="background:#dc2626;" onclick="closeDebugPanel()">Close</button>
    </div>
    <div id="debugLog" style="background:#0f172a; padding:10px; border-radius:4px; max-height:400px; overflow:auto; font-family:monospace; font-size:0.85rem;"></div>
</div>

<!-- FORM -->
<div class="card">
    <h3>Form Pengajuan Klien/Supplier</h3>
    <form id="formRequestSupplier">
        <label>Nama Klien/PT <span style="color:red;">*</span></label>
        <input type="text" id="supplierName" required placeholder="Contoh: PT Samsung Indonesia">
        
        <label>Nama Kontak Person</label>
        <input type="text" id="supplierContact" placeholder="Opsional">
        
        <label>Nomor Telepon</label>
        <input type="text" id="supplierPhone" placeholder="Opsional">

        <label>Alamat Lengkap</label>
        <textarea id="supplierAddress" rows="3" placeholder="Opsional"></textarea>
        
        <button type="submit" class="btn primary" id="submitBtn" style="width:100%; margin-top:20px;">
             Kirim Request
        </button>
    </form>
</div>

<!-- HISTORY -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>Riwayat Request Saya</h3>
        <button class="btn btn-sm" onclick="refreshHistory()">Refresh</button>
    </div>
    <div id="historyContainer">
        <p>Memuat riwayat...</p>
    </div>
</div>

<!-- NO INLINE SCRIPT - ALL LOGIC IN js/request_item.js -->