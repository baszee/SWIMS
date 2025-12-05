<?php
// FILE: api/notes.php
// Fungsi: CRUD untuk Catatan Internal (Notes) antara Supervisor dan Owner.
session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ----------------------------------------------------------------------
// KEAMANAN: Memeriksa Otorisasi Sisi Server
// ----------------------------------------------------------------------

if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

// Hanya Supervisor dan Owner yang diizinkan mengakses Notes
if ($user_role !== 'supervisor' && $user_role !== 'owner') {
    api_response(false, "Otorisasi ditolak. Akses Notes hanya untuk Supervisor dan Owner.", null, 403);
}

// ----------------------------------------------------------------------
// PENANGANAN REQUEST
// ----------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // READ: Mengambil daftar Notes
        case 'GET':
            // Notes ditampilkan berdasarkan role: hanya yang dibuat untuk 'all', 'supervisor', atau 'owner'
            $sql = "
                SELECT n.*, u.username as created_by 
                FROM notes n
                JOIN users u ON n.created_by_user_id = u.id
                WHERE n.created_for_role = 'all' OR n.created_for_role = ?
                ORDER BY n.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_role]);
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            api_response(true, "Daftar catatan internal berhasil diambil.", $notes);

        // CREATE: Menambah Note baru
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $title = trim($data['title'] ?? '');
            $content = $data['content'] ?? '';
            $target_role = $data['target_role'] ?? 'all'; 

            if (empty($title) || empty($content)) {
                api_response(false, "Judul dan Isi Catatan wajib diisi.", null, 400);
            }
            
            $stmt = $pdo->prepare("INSERT INTO notes (title, content, created_by_user_id, created_for_role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$title, $content, $user_id, $target_role]);

            api_response(true, "Catatan baru berhasil dipublikasikan.", ['id' => $pdo->lastInsertId()], 201);
            
        // DELETE: Menghapus Note (hanya boleh dihapus oleh pembuat atau Admin/Owner)
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Catatan wajib diisi.", null, 400);
            }

            // Hapus jika user adalah pembuat ATAU Owner
            $sql = "DELETE FROM notes WHERE id = ? AND (created_by_user_id = ? OR ? = 'owner')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id, $user_id, $user_role]);
            
            if ($stmt->rowCount() === 0) {
                 api_response(false, "Catatan tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya.", null, 403);
            }

            api_response(true, "Catatan ID:{$id} berhasil dihapus.", null);

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in notes.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>