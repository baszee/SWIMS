<div class="card" id="loginCard" style="max-width: 400px; margin: 60px auto; transition: all 0.3s ease;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 id="loginTitleText" style="margin: 0; font-size: 2rem; font-weight: 700; transition: color 0.3s ease;">
      SWIMS
    </h2>
    <p class="small" style="margin: 8px 0 0 0; font-weight: 500; color: var(--text-muted);">
      Warehouse Inventory System
    </p>
  </div>

  <form id="formLogin">
    <label>Username</label>
    <input type="text" id="login_username" required placeholder="Username">
    
    <label>Password</label>
    <input type="password" id="login_password" required placeholder="Password">
    
    <label>Login Sebagai</label>
    <select id="login_role" required>
        <option value="" disabled selected>-- Pilih Role --</option>
        <option value="admin">Admin</option>
        <option value="staff">Staff</option>
        <option value="supervisor">Supervisor</option>
        <option value="owner">Owner</option>
    </select>
    
    <button type="submit" class="btn primary" style="width: 100%; margin-top: 25px;">
        Masuk
    </button>
    
    <div id="loginMessage" style="color: var(--danger); margin-top: 15px; text-align: center; font-size: 0.9rem;"></div>
  </form>

</div>