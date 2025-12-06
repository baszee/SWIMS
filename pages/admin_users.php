<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>👥 Manajemen Pengguna</h2>
        <button class="btn primary" onclick="showUserForm()">+ Tambah User Baru</button>
    </div>
    <p class="small">Administrator dapat menambah, mengubah role, dan menonaktifkan akun pengguna SWIMS.</p>
</div>

<div id="userListPanel">
    <!-- Konten tabel user akan di-load di sini oleh init_admin_users() -->
    <div class="card">
        <p>Memuat daftar pengguna...</p>
    </div>
</div>