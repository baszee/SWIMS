<div class="card">
  <div style="display: flex; align-items: center; margin-bottom: 5px;">
    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📦</span> Barang Masuk
    </h2>
  </div>
  
  <form id="formBarangMasuk">
    <!-- Dropdown Supplier -->
    <label>Pilih Klien/Supplier (Wajib)</label>
    <select id="bm_supplier_id" required>
        <option value="">-- Pilih Klien Pemilik Barang --</option>
    </select>
    
    <!-- Input SKU Item (Autocomplete) -->
    <label>SKU Barang</label>
    <div style="position: relative;">
        <input type="text" id="bm_sku_input" placeholder="Pilih Supplier dahulu" disabled>
        <input type="hidden" id="bm_item_id"> 
        <div id="autocompleteResultsSKU" class="autocomplete-dropdown" style="display:none;"></div>
    </div>
    <p class="small" id="skuInfo" style="margin-top: 5px; color: var(--muted);">Pilih Supplier terlebih dahulu</p>
    
    <!-- Input Nama Barang (Autocomplete) -->
    <label>Nama Barang</label>
    <div style="position: relative;">
        <input type="text" id="bm_name_input" placeholder="Pilih Supplier dahulu" disabled>
        <div id="autocompleteResultsName" class="autocomplete-dropdown" style="display:none;"></div>
    </div>
    <p class="small" id="nameInfo" style="margin-top: 5px; color: var(--muted);">Pilih Supplier terlebih dahulu</p>
    
    <!-- Unit Satuan -->
    <label>Unit Satuan</label>
    <select id="bm_unit" required>
        <option value="Pcs">Pcs</option>
        <option value="Unit">Unit</option>
        <option value="Box">Box</option>
        <option value="Karton">Karton</option>
    </select>
    
    <label>Jumlah</label>
    <input id="bm_qty" type="number" min="1" required>
    
    <label>Catatan</label>
    <textarea id="bm_note" rows="3" placeholder="Opsional: tambahkan catatan..."></textarea>
    
    <button class="btn success" type="submit">Request Barang Masuk</button>
  </form>
  
  <div class="card" style="margin-top:16px;background:#fef3c7;border-color:#fbbf24;">
    <h4 style="margin-top:0;">💡 Cara Kerja</h4>
    <p class="small" style="color:#78350f;margin:0;">
        <strong>1.</strong> Pilih Klien/Supplier dahulu<br>
        <strong>2.</strong> Ketik SKU atau Nama Barang:<br>
        &nbsp;&nbsp;&nbsp;• Jika sudah terdaftar → pilih dari dropdown<br>
        &nbsp;&nbsp;&nbsp;• Jika belum ada → input manual SKU + Nama + Unit<br>
        <strong>3.</strong> Item baru akan status PENDING sampai Supervisor approve
    </p>
  </div>
</div>

<!-- Riwayat Transaksi Saya -->
<div class="card">
    <h3>Riwayat Transaksi Masuk Saya</h3>
    <div id="riwayatMasukPanel">
        <p>Memuat riwayat transaksi...</p>
    </div>
</div>