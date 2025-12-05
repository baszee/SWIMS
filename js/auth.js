/**
 * =========================================================
 * AUTH.JS - LOGIN MODULE
 * Menangani logika AJAX untuk proses login.
 * =========================================================
 */

/* init_login - Logic Login Form AJAX */
function init_login(){ 
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('loginMessage');
    if (!form) return;

    form.onsubmit = function(e){
        e.preventDefault();
        msg.textContent = 'Authenticating...';
        msg.style.color = '#2563eb';
        
        const username = document.getElementById('login_username').value.trim();
        const password = document.getElementById('login_password').value;
        const role = document.getElementById('login_role').value;
        
        if (!username || !password || !role) {
            msg.textContent = 'Semua field harus diisi!';
            msg.style.color = '#ef4444';
            return;
        }
        
        fetch('api/auth.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, role})
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                msg.textContent = '✅ Login berhasil! Redirecting...';
                msg.style.color = '#16a34a';
                
                // Gunakan fungsi global dari app.js
                storageSet('swims_current_user', { username: username, role: data.role });
                
                renderUserBar();
                renderMenu();
                
                setTimeout(() => {
                    loadPage(roleLanding(data.role));
                }, 800);
                
            } else {
                msg.textContent = '❌ ' + data.message;
                msg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            msg.textContent = '❌ Error koneksi server. Cek WAMP dan path API.';
            msg.style.color = '#ef4444';
            console.error('Login error:', err);
        });
    };
}

// Expose init function
window.init_login = init_login;