<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - SWIMS</title>
    <style>
        /* =====================================================
           SWIMS MODERN LOGIN - CLEAN & PROFESSIONAL
           ===================================================== */

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            overflow: hidden;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Background Image Container */
        .background-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        .background-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            /* Filter dikurangi sedikit agar background lebih jelas karena card lebih transparan */
            filter: brightness(0.6) contrast(1.1);
        }

        /* Dark overlay */
        .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                135deg,
                rgba(30, 41, 59, 0.85) 0%,
                rgba(15, 23, 42, 0.75) 100%
            );
            z-index: 2;
        }

        /* Top Navigation */
        .top-nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            padding: 24px 48px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideDown 0.8s ease;
        }

        .logo-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .logo-text {
            font-size: 1.5rem;
            font-weight: 800;
            color: white;
            letter-spacing: 1px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .system-badge {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.85rem;
            font-weight: 500;
        }

        /* Login Container */
        .login-container {
            position: relative;
            z-index: 100;
            width: 100%;
            max-width: 440px;
            padding: 0 20px;
            animation: fadeInUp 1s ease;
        }

        /* Glass Card - UPDATED FOR MORE TRANSPARENCY */
      /* Glass Card */
        .login-card {
            /* Ubah 0.05 menjadi 0.02 agar lebih bening */
            background: rgba(255, 255, 255, 0.0); 
            
            /* Border sangat tipis */
            border: 1px solid rgba(255, 255, 255, 0.03); 

            /* ...sisanya sama... */
            backdrop-filter: blur(30px) saturate(180%);
            border-radius: 20px;
            padding: 48px 40px;
            box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Title Section */
        .card-header {
            text-align: center;
            margin-bottom: 36px;
        }

        .card-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        .card-subtitle {
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
        }

        /* Form Group */
        .form-group {
            margin-bottom: 24px;
        }

        .form-label {
            display: block;
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
            letter-spacing: 0.3px;
        }

        /* Input field juga dibuat sedikit lebih transparan agar serasi */
        .form-input {
            width: 100%;
            padding: 14px 16px;
            /* Background input diubah dari 0.08 menjadi 0.05 */
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            color: white;
            font-size: 0.95rem;
            font-weight: 400;
            transition: all 0.3s ease;
            outline: none;
        }

        .form-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .form-input:focus {
            background: rgba(255, 255, 255, 0.12);
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        /* Submit Button */
        .btn-submit {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);
            margin-top: 28px;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(59, 130, 246, 0.45);
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        /* Message Display */
        .message-box {
            margin-top: 20px;
            padding: 14px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            text-align: center;
            display: none;
            animation: slideIn 0.3s ease;
        }

        .message-box.error {
            display: block;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .message-box.success {
            display: block;
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #86efac;
        }

        /* Footer Info */
        .login-footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-text {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.6;
        }

        /* Animations */
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-10px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .top-nav {
                padding: 16px 24px;
            }
            .logo-text {
                font-size: 1.3rem;
            }
            .system-badge {
                display: none;
            }
            .login-card {
                padding: 36px 28px;
            }
            .card-title {
                font-size: 1.5rem;
            }
        }

        /* Loading State */
        .btn-submit.loading {
            opacity: 0.7;
            pointer-events: none;
        }

        .btn-submit.loading::after {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-left: 10px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="background-wrapper">
        <img src="assets/images/warehouse-bg.jpg" alt="Warehouse Background" class="background-image">
        <div class="background-overlay"></div>
    </div>

    <div class="top-nav">
        <div class="logo-brand">
            <div class="logo-icon">📦</div>
            <div class="logo-text">SWIMS</div>
        </div>
        <div class="system-badge">
            Warehouse Management System
        </div>
    </div>

    <div class="login-container">
        <div class="login-card">
            <div class="card-header">
                <h2 class="card-title">Selamat Datang Kembali</h2>
                <p class="card-subtitle">Masuk untuk melanjutkan ke sistem</p>
            </div>

            <form id="formLogin">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input 
                        type="text" 
                        id="login_username" 
                        class="form-input" 
                        placeholder="Masukkan username Anda" 
                        required 
                        autocomplete="username"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input 
                        type="password" 
                        id="login_password" 
                        class="form-input" 
                        placeholder="Masukkan password Anda" 
                        required 
                        autocomplete="current-password"
                    >
                </div>

                <button type="submit" class="btn-submit" id="btnSubmit">
                    Masuk ke Sistem
                </button>

                <div id="loginMessage" class="message-box"></div>
            </form>

            <div class="login-footer">
                <p class="footer-text">
                    Sistem Manajemen Inventaris Gudang<br>
                    © 2025 SWIMS. Semua hak dilindungi.
                </p>
            </div>
        </div>
    </div>

    <script>
        // Form submission logic is handled by js/auth.js (init_login function)
        console.log('✅ Modern Login Page Loaded (More Transparent)');
    </script>
</body>
</html>