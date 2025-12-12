<div class="card" id="loginCard" style="max-width: 400px; margin: 40px auto; transition: border 0.3s ease;">
  
  <h2 id="loginTitleText" style="text-align:center; margin:0 0 5px 0; font-size:1.8rem; font-weight:700; transition: color 0.3s ease;">
    SWIMS
  </h2>
  <p class="small" style="text-align:center; font-weight:600; color: var(--text-main);">Warehouse Inventory System</p>
  
  <hr style="margin: 20px 0;">

  <form id="formLogin">
    <label>Username</label>
    <input type="text" id="login_username" required placeholder="Masukkan username">
    
    <label>Password</label>
    <input type="password" id="login_password" required placeholder="Masukkan password">
    
    <label>Masuk Sebagai (Pilih Role)</label>
    <select id="login_role" required>
        <option value="" disabled selected>-- Pilih Role --</option>
        <option value="admin">Administrator</option>
        <option value="staff">Staff Gudang</option>
        <option value="supervisor">Supervisor</option>
        <option value="owner">Owner (Pemilik)</option>
    </select>
    
    <button type="submit" class="btn primary" style="width:100%; margin-top:25px;">
        Masuk
    </button>
    
    <div id="loginMessage" style="color:var(--danger); margin-top:15px; text-align:center; font-size:0.9rem;"></div>
  </form>

</div>

<script>
    // Menyembunyikan header utama aplikasi agar tampilan login lebih fokus
    document.addEventListener('DOMContentLoaded', function() {
        const header = document.getElementById('contentHeader');
        if (header) {
            header.style.display = 'none';
        }
    });
</script>