<?php
// FILE: api/notes.php - SECURE VERSION
// Fungsi: Catatan Internal (Hanya Supervisor & Owner)

include('../config/db_config.php'); 
include('../utils/SessionManager.php'); // Security Helper

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// 1. Wajib Login & Cek Timeout
SessionManager::requireAuth();

// 2. Role Check (Hanya Supervisor & Owner)
SessionManager::requireRole(['supervisor', 'owner']);

$user = SessionManager::getUser();
$user_role = $user['role'];
$user_id = $user['id'];

// Request Handler
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        
        // GET: Ambil Notes
        case 'GET':
            $sql = "
                SELECT n.*, u.username as created_by 
                FROM notes n
                JOIN users u ON n.created_by_user_id = u.id
                WHERE n.created_for_role = 'all' OR n.created_for_role = ?
                ORDER BY n.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_role]);
            
            api_response(true, "Daftar catatan internal berhasil diambil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        // POST: Buat Note Baru
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
            break;
            
        // DELETE: Hapus Note (Hanya pembuat atau Owner)
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
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (PDOException $e) {
    error_log("DB Error in notes.php: " . $e->getMessage());
    api_response(false, "Kesalahan database.", null, 500);
}
?>