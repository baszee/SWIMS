<div class="card">
  <h2>📦 Barang Masuk</h2>
  <form id="formBarangMasuk">
    <label>Pilih Item</label>
    <select id="bm_item" required></select>
    <label>Jumlah</label>
    <input id="bm_qty" type="number" min="1" required>
    <label>Catatan</label>
    <textarea id="bm_note" rows="3" placeholder="Opsional: tambahkan catatan..."></textarea>
    <button class="btn success" type="submit">Request Barang Masuk</button>
  </form>
  <div class="card" style="margin-top:16px;background:#fef3c7;border-color:#fbbf24;">
    <h4 style="margin-top:0;">⚠️ Perhatian</h4>
    <p class="small" style="color:#78350f;margin:0;">Transaksi barang masuk akan disimpan sebagai <b>PENDING</b>. Stok <b>belum akan bertambah</b> sampai Supervisor melakukan approval. Ini memastikan setiap penambahan stok terverifikasi dengan baik.</p>
  </div>
</div>