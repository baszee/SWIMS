/**
 * =========================================================
 * AUTH.JS - LOGIN MODULE (FINAL FIX & SMOOTH TRANSITION)
 * Menangani logika AJAX untuk proses login.
 * =========================================================
 */

/* init_login - Logic Login Form AJAX */
function init_login(){ 
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('loginMessage');
    const roleSelect = document.getElementById('login_role');
    // Cari elemen card terdekat untuk efek visual
    const loginCard = form?.closest('.card'); 

    if (!form || !roleSelect || !loginCard) {
        // Tambahkan cek ini untuk debug jika elemen tidak ada
        console.error('Login page elements missing!');
        return;
    }

    // --- Dynamic Color Application on Role Change ---
    // Mengambil warna dari ROLE_COLORS yang diekspos di app.js
    const ROLE_COLORS = window.ROLE_COLORS;
    
    const applyDynamicColor = function() {
        const selectedRole = roleSelect.value;
        const color = ROLE_COLORS ? ROLE_COLORS[selectedRole] : null;
        
        // Bersihkan kelas role yang ada
        loginCard.classList.forEach(className => {
            if (className.startsWith('login-')) {
                loginCard.classList.remove(className);
            }
        });
        
        // Terapkan warna ke variabel CSS dan card
        if (selectedRole && color) {
            // Set warna ke CSS variable utama (ini akan mengupdate tombol & title)
            window.setRoleColor(selectedRole); 
            // Tambahkan kelas untuk efek visual pada card
            loginCard.classList.add(`login-${selectedRole}`);
        } else {
             // Set warna default Admin jika belum ada role yang dipilih
             window.setRoleColor('admin'); 
        }
        
        // Perbarui warna teks judul
        const titleElement = document.getElementById('loginTitleText');
        if(titleElement) {
             titleElement.style.color = window.getComputedStyle(document.documentElement).getPropertyValue('--current-role-color');
        }
    };
    
    // Inisialisasi event listener
    if (typeof window.setRoleColor === 'function' && ROLE_COLORS) {
        roleSelect.addEventListener('change', applyDynamicColor);
        applyDynamicColor(); // Set warna awal (default ke Admin jika belum dipilih)
    }
    // --- End Dynamic Color Application ---
    

    form.onsubmit = function(e){
        e.preventDefault();
        
        applyDynamicColor(); // Pastikan warna terakhir diterapkan
        
        const username = document.getElementById('login_username').value.trim();
        const password = document.getElementById('login_password').value;
        const role = roleSelect.value;
        
        if (!username || !password || !role) {
            msg.textContent = 'Semua field harus diisi!';
            msg.style.color = '#ef4444';
            return;
        }
        
        // Gunakan loading modal untuk menutupi proses fetch
        window.showLoadingModal('Authenticating...');
        
        fetch('api/auth.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, role})
        })
        .then(r => r.json())
        .then(data => {
            // Loading modal akan dihilangkan di loadPage() untuk transisi yang lebih mulus
            
            if (data.success) {
                msg.textContent = ' Login berhasil! Redirecting...';
                msg.style.color = '#16a34a';
                
                // 1. Set Local Storage (Perlu ID user yang dikirim dari API)
                window.storageSet('swims_current_user', { 
                    // API auth.php belum mengembalikan ID, jadi kita pakai user/role saja.
                    // Jika API diubah, tambahkan 'id: data.id' di sini.
                    username: username, 
                    role: data.role 
                });

                if (window.ThemeManager) {
                window.ThemeManager.applyTheme(data.role);
                }       
                
                // 2. Render Sidebar Components 
                window.renderSidebarUser(); 
                window.renderSidebarNav(); 
                
                // 3. Redirect SECEPATNYA (smooth transition)
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