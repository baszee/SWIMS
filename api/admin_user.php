<?php
/**
 * =========================================================
 * FILE: api/admin_user.php - FIXED v2.1
 * Fix: Password validation now ACTIVE
 * =========================================================
 */

session_start();
include('../config/db_config.php');
include('../utils/ActivityLogger.php');
include('../utils/PasswordValidator.php'); // ✅ FIXED: Include validator

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
            
            // ✅ FIXED: Validate password strength
            $validation = PasswordValidator::validate($password);
            if (!$validation['valid']) {
                api_response(false, $validation['message'], [
                    'errors' => $validation['errors'],
                    'strength' => $validation['strength']
                ], 400);
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
                    'role' => $role,
                    'password_strength' => $validation['strength']
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

            if (!$old_data) {
                api_response(false, "User tidak ditemukan.", null, 404);
            }

            $sql = "UPDATE users SET role = ?, is_active = ?";
            $params = [$role, $is_active];

            // ✅ FIXED: Validate password if changing
            if (!empty($new_password)) {
                $validation = PasswordValidator::validate($new_password);
                if (!$validation['valid']) {
                    api_response(false, $validation['message'], [
                        'errors' => $validation['errors'],
                        'strength' => $validation['strength']
                    ], 400);
                }
                
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
            if (!empty($new_password)) $changes[] = "password changed (strength: {$validation['strength']})";
            
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
        // DELETE: Deactivate OR Hard Delete user
        // ====================================================================
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $permanent = isset($_GET['permanent']) && $_GET['permanent'] === 'true';
            
            if (!$id) {
                api_response(false, "ID User wajib diisi.", null, 400);
            }
            
            // Prevent self-deletion
            if ((int)$id === (int)$admin_id) {
                api_response(false, "Anda tidak dapat menghapus akun Anda sendiri.", null, 403);
            }
            
            // Get username for logging
            $stmt_user = $pdo->prepare("SELECT username, role FROM users WHERE id = ?");
            $stmt_user->execute([$id]);
            $target_user = $stmt_user->fetch();
            
            if (!$target_user) {
                api_response(false, "User tidak ditemukan.", null, 404);
            }
            
            $target_username = $target_user['username'];
            $target_role = $target_user['role'];
            
            // Prevent deleting last admin
            if ($target_role === 'admin') {
                $stmt_count = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE");
                $admin_count = $stmt_count->fetchColumn();
                
                if ($admin_count <= 1) {
                    api_response(false, "Tidak dapat menghapus admin terakhir. Minimal 1 admin harus ada.", null, 403);
                }
            }
            
            if ($permanent) {
                // HARD DELETE
                try {
                    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                    $result = $stmt->execute([$id]);
                    
                    if (!$result) {
                        $errorInfo = $stmt->errorInfo();
                        error_log("Delete user error: " . json_encode($errorInfo));
                        api_response(false, "Gagal menghapus user: " . $errorInfo[2], null, 500);
                    }
                    
                    $logger->log(
                        $admin_id,
                        $admin_username,
                        'DELETE',
                        "Permanently deleted user: {$target_username} (role: {$target_role})",
                        [
                            'deleted_user_id' => $id,
                            'deleted_username' => $target_username,
                            'deleted_role' => $target_role,
                            'permanent' => true
                        ]
                    );
                    
                    api_response(true, "User '{$target_username}' berhasil dihapus secara permanen dari database.", null);
                    
                } catch (PDOException $e) {
                    error_log("Delete user PDO error: " . $e->getMessage());
                    
                    if (strpos($e->getMessage(), 'foreign key constraint') !== false || 
                        strpos($e->getMessage(), 'Cannot delete') !== false) {
                        api_response(false, "User tidak dapat dihapus karena masih memiliki data terkait di sistem (transaksi, item, dll). Gunakan Edit > Non-aktifkan untuk menonaktifkan user.", null, 409);
                    } else {
                        api_response(false, "Database error: " . $e->getMessage(), null, 500);
                    }
                }
                
            } else {
                // SOFT DELETE
                $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE WHERE id = ?");
                $stmt->execute([$id]);
                
                $logger->log(
                    $admin_id,
                    $admin_username,
                    'DEACTIVATE',
                    "Deactivated user: {$target_username}",
                    ['target_user_id' => $id, 'target_username' => $target_username]
                );
                
                api_response(true, "User '{$target_username}' berhasil di-nonaktifkan.", null);
            }
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (\PDOException $e) {
    error_log("Database Error in admin_user.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    api_response(false, "Kesalahan database: " . $e->getMessage(), null, 500);
} catch (\Exception $e) {
    error_log("General Error in admin_user.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    api_response(false, "Kesalahan server: " . $e->getMessage(), null, 500);
}
?>