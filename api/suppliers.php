<?php
// FILE: api/suppliers.php
// Fungsi: API CRUD untuk Data Master Supplier (Klien/PT Pemilik Barang)
session_start();
// Pastikan path sudah diubah menjadi '../config/db_config.php'
include('../config/db_config.php'); 

header('Content-Type: application/json');

// Helper untuk respons
function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// KEAMANAN: Memeriksa Session dan Otorisasi Sisi Server
// ----------------------------------------------------------------------

if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

// Hanya Admin dan Staff yang memiliki hak akses penuh ke Supplier/Item/Recipient
$allowed_roles = ['admin', 'staff', 'supervisor', 'owner'];
if (!in_array($user_role, $allowed_roles)) {
    api_response(false, "Otorisasi ditolak. Role Anda tidak diizinkan mengakses resource ini.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar Supplier
        case 'GET':
            // ---------------------------------------------------
            // Endpoint 1: Riwayat Request Staff Sendiri (action=my_requests)
            // ---------------------------------------------------
            if (isset($_GET['action']) && $_GET['action'] === 'my_requests') {
                // Hanya Staff yang boleh melihat requestnya sendiri
                if ($user_role !== 'staff') {
                    api_response(false, "Akses hanya untuk Staff.", null, 403);
                }
                
                // Ambil request supplier berdasarkan user_id yang sedang login
                $sql = "SELECT id, name, is_active, created_at FROM suppliers WHERE created_by_user_id = ? ORDER BY created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id]);
                $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                api_response(true, "Riwayat request supplier berhasil diambil.", $requests);
            }
            // ---------------------------------------------------

            // Endpoint 2: Daftar Supplier Aktif (action=list) - untuk dropdown
            if (isset($_GET['action']) && $_GET['action'] === 'list') {
                $stmt = $pdo->query("SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name ASC");
                $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar supplier berhasil diambil.", $suppliers);
            }
            
            // Endpoint 3: GET umum (tanpa action) - tampilkan semua data
            $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC");
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            api_response(true, "Data supplier berhasil diambil.", $suppliers);
            
            break; 

        // CREATE: Menambah Supplier baru
        case 'POST':
            // Hanya Admin/Staff yang bisa mengajukan Supplier baru
            if ($user_role !== 'admin' && $user_role !== 'staff') {
                api_response(false, "Anda tidak memiliki hak untuk menambahkan supplier.", null, 403);
            }

            $data = json_decode(file_get_contents("php://input"), true);
            $name = trim($data['name'] ?? '');
            $contact_person = $data['contact_person'] ?? '';
            $phone = $data['phone'] ?? '';
            $address = $data['address'] ?? '';

            if (empty($name)) {
                api_response(false, "Nama Supplier wajib diisi.", null, 400);
            }
            
            // Logika Persetujuan Otomatis:
            // Jika Admin, langsung TRUE. Jika Staff, PENDING (FALSE).
            $is_active_status = ($user_role === 'admin') ? TRUE : FALSE;
            $response_message = ($user_role === 'admin') ? "Supplier '{$name}' berhasil ditambahkan dan langsung disetujui." : "Permintaan Supplier '{$name}' berhasil diajukan dan menanti persetujuan Supervisor.";

            $stmt = $pdo->prepare("INSERT INTO suppliers (name, contact_person, phone, address, is_active, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $contact_person, $phone, $address, $is_active_status, $user_id]);

            api_response(true, $response_message, ['id' => $pdo->lastInsertId()], 201);
            
        // UPDATE: Mengubah data Supplier
        case 'PUT':
        case 'PATCH':
            // Hanya Admin/Supervisor yang bisa mengedit
            if ($user_role !== 'admin' && $user_role !== 'supervisor') {
                api_response(false, "Anda tidak memiliki hak untuk mengubah data supplier.", null, 403);
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $contact_person = $data['contact_person'] ?? '';
            $phone = $data['phone'] ?? '';
            $address = $data['address'] ?? '';
            $is_active = $data['is_active'] ?? null; 

            if (!$id || empty($name)) {
                api_response(false, "ID dan Nama Supplier wajib diisi.", null, 400);
            }

            $sql = "UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, address = ?, is_active = ? WHERE id = ?";
            $params = [$name, $contact_person, $phone, $address, $is_active, $id];

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            api_response(true, "Data Supplier ID:{$id} berhasil diupdate.", null);

        // DELETE: Menghapus (Deactivate) Supplier
        case 'DELETE':
            // Hanya Admin yang bisa menghapus
            if ($user_role !== 'admin') {
                api_response(false, "Anda tidak memiliki hak untuk menghapus supplier.", null, 403);
            }
            
            // Ambil ID dari query string
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Supplier wajib diisi untuk menghapus.", null, 400);
            }
            
            // Praktik terbaik adalah DEACTIVATE, bukan DELETE permanen
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$id]);

            api_response(true, "Supplier ID:{$id} berhasil di-deactivate (dihapus logis).", null);

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    // Tangani error database
    error_log("Database Error in suppliers.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>