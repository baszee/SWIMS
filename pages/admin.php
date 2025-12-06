<!-- Admin Dashboard Page -->
<div id="adminUserList">
    <!-- Dashboard akan di-load oleh init_admin() di js/dashboard.js -->
    <div class="card">
        <p style="text-align:center;">
            <span style="font-size:2rem;">⏳</span><br>
            Memuat dashboard admin...
        </p>
    </div>
</div>

<script>
// Debug: Pastikan element ada
console.log('pages/admin.php loaded');
console.log('adminUserList element:', document.getElementById('adminUserList'));

// Panggil init jika belum terpanggil
if (typeof init_admin === 'function') {
    console.log('Calling init_admin from page...');
    init_admin();
} else {
    console.error('init_admin function not found! Check if dashboard.js is loaded.');
}
</script>