<?php
/**
 * =========================================================
 * FILE: verify_nota.php
 * FUNGSI: Verifikasi Nota Publik (Tanpa Login)
 * AKSES: Public - Bisa diakses via QR Code / ngrok
 * 
 * CARA SETUP NGROK:
 * 1. Download ngrok dari https://ngrok.com/download
 * 2. Extract dan jalankan: ngrok http 80 (atau port WAMP Anda)
 * 3. Copy URL ngrok (contoh: https://xxxx-xxxx.ngrok-free.app)
 * 4. Paste URL ke js/pdf_generator.js di bagian NGROK_URL
 * =========================================================
 */

// Database connection
require_once 'config/db_config.php';

// Get transaction code from URL
$trx_code = $_GET['code'] ?? '';
$is_valid = false;
$data = null;
$items = [];
$error_message = '';

if ($trx_code) {
    try {
        // 1. Ambil Data Transaksi APPROVED
        $stmt = $pdo->prepare("
            SELECT 
                t.*,
                i.name as item_name,
                i.sku,
                i.unit,
                u_app.username as approver_name,
                u_req.username as requester_name,
                s.name as supplier_name
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
            LEFT JOIN users u_req ON t.request_by_user_id = u_req.id
            LEFT JOIN suppliers s ON t.supplier_id = s.id
            WHERE t.transaction_code = ? AND t.status = 'APPROVED'
        ");
        
        $stmt->execute([$trx_code]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $data = $result;
            $is_valid = true;
        } else {
            $error_message = "Kode transaksi tidak ditemukan atau belum disetujui";
        }
        
    } catch (PDOException $e) {
        error_log("Verify Nota Error: " . $e->getMessage());
        $error_message = "Terjadi kesalahan sistem";
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Nota - SWIMS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 500px;
        }
        
        .card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            animation: slideUp 0.5s ease;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .header {
            padding: 40px 30px;
            text-align: center;
            color: white;
            position: relative;
        }
        
        .header.valid {
            background: linear-gradient(135deg, #28a745, #20c997);
        }
        
        .header.invalid {
            background: linear-gradient(135deg, #dc3545, #c82333);
        }
        
        .header.empty {
            background: linear-gradient(135deg, #6c757d, #5a6268);
        }
        
        .icon {
            font-size: 70px;
            margin-bottom: 15px;
            display: block;
            animation: bounce 1s ease;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 10px 0;
            letter-spacing: 1px;
        }
        
        .header p {
            font-size: 1rem;
            opacity: 0.95;
            margin: 0;
        }
        
        .content {
            padding: 30px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .label {
            font-size: 0.85rem;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .value {
            font-size: 1rem;
            font-weight: 600;
            color: #212529;
            text-align: right;
        }
        
        .details-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .details-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: #495057;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-in {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .badge-out {
            background: #f8d7da;
            color: #721c24;
        }
        
        .warning-box {
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 6px;
        }
        
        .warning-box strong {
            color: #856404;
            display: block;
            margin-bottom: 5px;
        }
        
        .warning-box p {
            color: #856404;
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.5;
        }
        
        .security-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            color: #155724;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 15px;
        }
        
        .hash-display {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin-top: 15px;
            word-break: break-all;
            font-family: monospace;
            font-size: 0.75rem;
            color: #495057;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.85rem;
        }
        
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 5px;
            font-weight: 700;
            color: #495057;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .empty-state .icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        
        .empty-state h2 {
            font-size: 1.5rem;
            color: #495057;
            margin-bottom: 10px;
        }
        
        .empty-state p {
            font-size: 1rem;
            line-height: 1.6;
        }
        
        @media (max-width: 600px) {
            .header h1 {
                font-size: 1.5rem;
            }
            
            .icon {
                font-size: 50px;
            }
            
            .content {
                padding: 20px;
            }
            
            .info-row {
                flex-direction: column;
                gap: 5px;
            }
            
            .value {
                text-align: left;
            }
        }
    </style>
</head>
<body>

<div class="container">
    <div class="card">
        <?php if (!$trx_code): ?>
            <!-- Empty State -->
            <div class="header empty">
                <span class="icon">📋</span>
                <h1>Verifikasi Nota</h1>
                <p>SWIMS Verification System</p>
            </div>
            <div class="empty-state">
                <span class="icon">🔍</span>
                <h2>Scan QR Code</h2>
                <p>Gunakan kamera smartphone Anda untuk memindai QR code pada nota transaksi</p>
            </div>
            
        <?php elseif ($is_valid && $data): ?>
            <!-- Valid Transaction -->
            <div class="header valid">
                <span class="icon">✅</span>
                <h1>VERIFIED</h1>
                <p>Nota Asli & Terdaftar</p>
            </div>
            
            <div class="content">
                <div class="info-row">
                    <span class="label">Kode Transaksi</span>
                    <span class="value"><?php echo htmlspecialchars($data['transaction_code']); ?></span>
                </div>
                
                <div class="info-row">
                    <span class="label">Tipe</span>
                    <span class="value">
                        <?php if ($data['type'] === 'IN'): ?>
                            <span class="badge badge-in">📦 BARANG MASUK</span>
                        <?php else: ?>
                            <span class="badge badge-out">📤 BARANG KELUAR</span>
                        <?php endif; ?>
                    </span>
                </div>
                
                <div class="info-row">
                    <span class="label">Tanggal Approval</span>
                    <span class="value"><?php echo date('d M Y, H:i', strtotime($data['approval_date'])); ?></span>
                </div>
                
                <div class="info-row">
                    <span class="label">Disetujui Oleh</span>
                    <span class="value"><?php echo htmlspecialchars($data['approver_name']); ?></span>
                </div>
                
                <!-- Detail Barang -->
                <div class="details-box">
                    <div class="details-title">📋 Detail Barang</div>
                    
                    <div class="detail-item">
                        <span class="label">Item</span>
                        <span class="value"><?php echo htmlspecialchars($data['item_name']); ?></span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="label">SKU</span>
                        <span class="value"><?php echo htmlspecialchars($data['sku']); ?></span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="label">Jumlah</span>
                        <span class="value"><strong><?php echo number_format($data['quantity']); ?> <?php echo htmlspecialchars($data['unit']); ?></strong></span>
                    </div>
                    
                    <?php if ($data['type'] === 'IN' && $data['supplier_name']): ?>
                    <div class="detail-item">
                        <span class="label">Supplier</span>
                        <span class="value"><?php echo htmlspecialchars($data['supplier_name']); ?></span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($data['type'] === 'OUT' && $data['recipient_name']): ?>
                    <div class="detail-item">
                        <span class="label">Penerima</span>
                        <span class="value"><?php echo htmlspecialchars($data['recipient_name']); ?></span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($data['note']): ?>
                    <div class="detail-item">
                        <span class="label">Catatan</span>
                        <span class="value" style="text-align:right; max-width:60%;"><?php echo htmlspecialchars($data['note']); ?></span>
                    </div>
                    <?php endif; ?>
                </div>
                
                <?php if ($data['nota_hash']): ?>
                    <div class="security-badge">
                        <span>🔐</span>
                        <span>Protected by Cryptographic Hash</span>
                    </div>
                    <div class="hash-display">
                        <strong>Hash Signature:</strong><br>
                        <?php echo substr($data['nota_hash'], 0, 32); ?><br>
                        <?php echo substr($data['nota_hash'], 32); ?>
                    </div>
                <?php endif; ?>
                
                <div class="warning-box">
                    <strong>⚠️ PENTING!</strong>
                    <p>Jika data di atas berbeda dengan nota fisik yang Anda terima, segera laporkan kepada supervisor. Kemungkinan nota fisik adalah <strong>palsu atau telah dimanipulasi</strong>.</p>
                </div>
            </div>
            
        <?php else: ?>
            <!-- Invalid Transaction -->
            <div class="header invalid">
                <span class="icon">🚫</span>
                <h1>INVALID</h1>
                <p>Data Tidak Ditemukan</p>
            </div>
            
            <div class="content">
                <div class="warning-box" style="background:#f8d7da; border-color:#f5c6cb;">
                    <strong style="color:#721c24;">❌ Verifikasi Gagal</strong>
                    <p style="color:#721c24;">
                        Kode transaksi <strong><?php echo htmlspecialchars($trx_code); ?></strong> tidak terdaftar di sistem kami atau belum disetujui.
                    </p>
                    <p style="color:#721c24; margin-top:10px;">
                        <strong>Indikasi dokumen palsu atau tidak valid.</strong>
                    </p>
                </div>
                
                <div style="margin-top:20px; padding:15px; background:#fff3cd; border-radius:6px; border-left:4px solid #ffc107;">
                    <strong style="color:#856404; display:block; margin-bottom:5px;">💡 Kemungkinan Penyebab:</strong>
                    <ul style="margin:5px 0 0 20px; color:#856404; font-size:0.9rem;">
                        <li>Nota belum disetujui oleh Supervisor</li>
                        <li>Kode transaksi salah atau tidak lengkap</li>
                        <li>Dokumen dipalsukan</li>
                    </ul>
                </div>
            </div>
        <?php endif; ?>
        
        <!-- Footer -->
        <div class="footer">
            <div class="logo">
                <span>📦</span>
                <span>SWIMS Verification System</span>
            </div>
            <div><?php echo date('Y'); ?> - Secure Warehouse Inventory Management</div>
        </div>
    </div>
</div>

</body>
</html>