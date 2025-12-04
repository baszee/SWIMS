<div class="card" style="max-width: 400px; margin: 40px auto;">
  <h2 style="text-align:center; color: var(--primary);">Login SWIMS</h2>
  <p class="small" style="text-align:center;">Silakan masuk untuk melanjutkan</p>
  
  <form id="formLogin">
    <label>Username</label>
    <input type="text" id="login_username" required placeholder="Masukkan username">
    
    <label>Password</label>
    <input type="password" id="login_password" required placeholder="Masukkan password">
    
    <label>Masuk Sebagai</label>
    <select id="login_role" required>
        <option value="" disabled selected>-- Pilih Role --</option>
        <option value="admin">Administrator</option>
        <option value="staff">Staff Gudang</option>
        <option value="supervisor">Supervisor</option>
        <option value="owner">Owner (Pemilik)</option>
    </select>
    
    <button type="submit" class="btn primary" style="width:100%; margin-top:20px;">Masuk</button>
    
    <div id="loginMessage" style="color:var(--danger); margin-top:15px; text-align:center; font-size:0.9rem;"></div>
  </form>
</div>