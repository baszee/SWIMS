<?php
/**
 * =========================================================
 * FILE: api/admin_user.php - Enhanced with Activity Logging
 * =========================================================
 */

session_start();
include('../config/db_config.php');
include('../utils/ActivityLogger.php');

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ========================================
// SECURITY CHECK
// ========================================
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    api_response(false, "Akses ditolak. Hanya Administrator yang diizinkan.", null, 403);
}

$admin_id = $_SESSION['user']['id'];
$admin_username = $_SESSION['user']['username'];

// Initialize logger
$logger = new ActivityLogger($pdo);

// ========================================
// REQUEST HANDLER
// ========================================
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        
        // ====================================================================
        // GET: Retrieve user list
        // ====================================================================
        case 'GET':
            $stmt = $pdo->query("SELECT id, username, role, is_active, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Log view action
            $logger->log(
                $admin_id,
                $admin_username,
                'VIEW',
                "Viewed user list",
                ['count' => count($users)]
            );
            
            api_response(true, "Daftar pengguna berhasil diambil.", $users);
            break;
        
        // ====================================================================
        // POST: Create new user
        // ====================================================================
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $username = trim($data['username'] ?? '');
            $password = $data['password'] ?? '123456';
            $role = $data['role'] ?? null;

            if (empty($username) || empty($role)) {
                api_response(false, "Username dan Role wajib diisi.", null, 400);
            }
            
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // Check duplicate username
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $stmt_check->execute([$username]);
            if ($stmt_check->fetchColumn() > 0) {
                api_response(false, "Username '{$username}' sudah digunakan.", null, 409);
            }

            // Insert user
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashed_password, $role]);
            $new_user_id = $pdo->lastInsertId();
            
            // Log create action
            $logger->log(
                $admin_id,
                $admin_username,
                'CREATE',
                "Created new user: {$username} with role {$role}",
                [
                    'new_user_id' => $new_user_id,
                    'new_username' => $username,
                    'role' => $role
                ]
            );

            api_response(true, "User '{$username}' dengan role {$role} berhasil ditambahkan.", ['id' => $new_user_id], 201);
            break;
            
        // ====================================================================
        // PUT/PATCH: Update user
        // ====================================================================
        case 'PUT':
        case 'PATCH':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $role = $data['role'] ?? null;
            $is_active = $data['is_active'] ?? null;
            $new_password = $data['new_password'] ?? null;

            if (!$id) {
                api_response(false, "ID User wajib diisi.", null, 400);
            }
            
            // Get old data for logging
            $stmt_old = $pdo->prepare("SELECT username, role, is_active FROM users WHERE id = ?");
            $stmt_old->execute([$id]);
            $old_data = $stmt_old->fetch();

            $sql = "UPDATE users SET role = ?, is_active = ?";
            $params = [$role, $is_active];

            // Add password update if provided
            if (!empty($new_password)) {
                $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
                $sql .= ", password = ?";
                $params[] = $hashed_password;
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            // Log update action
            $changes = [];
            if ($old_data['role'] != $role) $changes[] = "role: {$old_data['role']} → {$role}";
            if ($old_data['is_active'] != $is_active) $changes[] = "status: " . ($old_data['is_active'] ? 'active' : 'inactive') . " → " . ($is_active ? 'active' : 'inactive');
            if (!empty($new_password)) $changes[] = "password changed";
            
            $logger->log(
                $admin_id,
                $admin_username,
                'UPDATE',
                "Updated user {$old_data['username']}: " . implode(', ', $changes),
                [
                    'user_id' => $id,
                    'username' => $old_data['username'],
                    'changes' => $changes
                ]
            );

            api_response(true, "Data User ID:{$id} berhasil diupdate.", null);
            break;

        // ====================================================================
        // DELETE: Deactivate user
        // ====================================================================
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID User wajib diisi.", null, 400);
            }
            
            // Prevent self-deactivation
            if ((int)$id === (int)$admin_id) {
                api_response(false, "Anda tidak dapat menonaktifkan akun Anda sendiri.", null, 403);
            }
            
            // Get username for logging
            $stmt_user = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt_user->execute([$id]);
            $target_username = $stmt_user->fetchColumn();
            
            // Deactivate user
            $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$id]);
            
            // Log deactivate action
            $logger->log(
                $admin_id,
                $admin_username,
                'DEACTIVATE',
                "Deactivated user: {$target_username}",
                ['target_user_id' => $id, 'target_username' => $target_username]
            );

            api_response(true, "User ID:{$id} berhasil di-nonaktifkan.", null);
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in admin_user.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database. Cek log.", null, 500);
}
?>