/**
 * =========================================================
 * AUTH.JS - LOGIN MODULE (SIMPLIFIED & AUTO-DETECT ROLE)
 * Menangani logika AJAX untuk proses login otomatis.
 * =========================================================
 */

/* init_login - Logic Login Form AJAX */
function init_login(){ 
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('loginMessage');
    // const loginCard = form?.closest('.card'); // Tidak perlu manipulasi card pre-login

    if (!form) {
        // Fallback check agar tidak error di halaman lain
        return;
    }

    // Set default color theme (Admin/Blue) saat di halaman login
    // karena kita belum tahu role usernya apa.
    if (typeof window.setRoleColor === 'function') {
        window.setRoleColor('admin'); 
    }

    form.onsubmit = function(e){
        e.preventDefault();
        
        const username = document.getElementById('login_username').value.trim();
        const password = document.getElementById('login_password').value;
        
        // Validasi Sederhana
        if (!username || !password) {
            msg.textContent = 'Username dan Password harus diisi!';
            msg.style.color = '#ef4444';
            return;
        }
        
        // Gunakan loading modal untuk UX
        window.showLoadingModal('Authenticating...');
        
        fetch('api/auth.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // HANYA KIRIM USERNAME & PASSWORD (Role didapat dari server)
            body: JSON.stringify({username, password}) 
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                msg.textContent = ' Login berhasil! Redirecting...';
                msg.style.color = '#16a34a';
                
                // 1. Set Local Storage
                // Kita gunakan Role yang dikirim balik oleh server (data.role)
                window.storageSet('swims_current_user', { 
                    username: username, 
                    role: data.role 
                });

                // 2. Terapkan Tema sesuai Role yang baru didapat
                if (window.ThemeManager) {
                    window.ThemeManager.applyTheme(data.role);
                }       
                
                // 3. Render Sidebar Components 
                window.renderSidebarUser(); 
                window.renderSidebarNav(); 
                
                // 4. Redirect SECEPATNYA (smooth transition)
                // loadPage akan menghapus loading modal
                window.loadPage(window.roleLanding(data.role)); 
                
            } else {
                window.hideLoadingModal();
                msg.textContent = ' ' + data.message;
                msg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            window.hideLoadingModal();
            msg.textContent = ' Error koneksi server. Cek WAMP dan path API.';
            msg.style.color = '#ef4444';
            console.error('Login error:', err);
        });
    };
}

// Expose init function
window.init_login = init_login; 