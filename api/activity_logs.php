<?php
// FILE: api/activity_logs.php
// Fungsi: API untuk Activity Logs Management
session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ======================================================================
// HELPER: Log Activity Function (untuk dipanggil dari script lain)
// ======================================================================
function logActivity($pdo, $user_id, $username, $action, $description = '', $ip_address = null) {
    if (!$ip_address) {
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, username, action, description, ip_address) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$user_id, $username, $action, $description, $ip_address]);
        return true;
    } catch (PDOException $e) {
        error_log("Activity Log Error: " . $e->getMessage());
        return false;
    }
}

// ======================================================================
// SECURITY CHECK
// ======================================================================
if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

// Hanya Admin yang bisa akses activity logs
if ($user_role !== 'admin') {
    api_response(false, "Otorisasi ditolak. Hanya Administrator.", null, 403);
}

// ======================================================================
// REQUEST HANDLER
// ======================================================================
$method = $_SERVER['REQUEST_METHOD'];

try {
    
    switch ($method) {
        // ================================================================
        // GET: Retrieve Activity Logs
        // ================================================================
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            
            if ($action === 'list') {
                // Get all logs (paginated)
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                $user_filter = $_GET['user_id'] ?? null;
                
                $sql = "SELECT * FROM activity_logs";
                $params = [];
                
                if ($user_filter) {
                    $sql .= " WHERE user_id = ?";
                    $params[] = $user_filter;
                }
                
                $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
                $params[] = $limit;
                $params[] = $offset;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get total count
                $countSql = "SELECT COUNT(*) as total FROM activity_logs";
                if ($user_filter) {
                    $countSql .= " WHERE user_id = ?";
                    $countStmt = $pdo->prepare($countSql);
                    $countStmt->execute([$user_filter]);
                } else {
                    $countStmt = $pdo->query($countSql);
                }
                $total = $countStmt->fetch()['total'];
                
                api_response(true, "Activity logs berhasil diambil.", [
                    'logs' => $logs,
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset
                ]);
                
            } elseif ($action === 'stats') {
                // Get activity statistics
                $sql = "
                    SELECT 
                        COUNT(*) as total_activities,
                        COUNT(DISTINCT user_id) as active_users,
                        COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as total_logins,
                        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_activities
                    FROM activity_logs
                ";
                $stmt = $pdo->query($sql);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Get top 5 most active users
                $topUsersSql = "
                    SELECT username, COUNT(*) as activity_count
                    FROM activity_logs
                    GROUP BY user_id, username
                    ORDER BY activity_count DESC
                    LIMIT 5
                ";
                $topUsersStmt = $pdo->query($topUsersSql);
                $topUsers = $topUsersStmt->fetchAll(PDO::FETCH_ASSOC);
                
                api_response(true, "Statistik aktivitas berhasil diambil.", [
                    'stats' => $stats,
                    'top_users' => $topUsers
                ]);
                
            } elseif ($action === 'user_activity') {
                // Get activity for specific user
                $user_id_param = $_GET['user_id'] ?? null;
                
                if (!$user_id_param) {
                    api_response(false, "User ID wajib diisi.", null, 400);
                }
                
                $sql = "
                    SELECT * FROM activity_logs 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 20
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id_param]);
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                api_response(true, "Aktivitas user berhasil diambil.", $logs);
            }
            break;
            
        // ================================================================
        // POST: Create Activity Log (manual)
        // ================================================================
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            $target_user_id = $data['user_id'] ?? $user_id;
            $username = $data['username'] ?? $_SESSION['user']['username'];
            $action = $data['action'] ?? '';
            $description = $data['description'] ?? '';
            
            if (empty($action)) {
                api_response(false, "Action wajib diisi.", null, 400);
            }
            
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
            
            $result = logActivity($pdo, $target_user_id, $username, $action, $description, $ip_address);
            
            if ($result) {
                api_response(true, "Activity log berhasil dicatat.", null, 201);
            } else {
                api_response(false, "Gagal mencatat activity log.", null, 500);
            }
            break;
            
        // ================================================================
        // DELETE: Clear Old Logs
        // ================================================================
        case 'DELETE':
            $days = $_GET['days'] ?? 30; // Default: hapus log > 30 hari
            
            $sql = "DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$days]);
            
            $deleted = $stmt->rowCount();
            
            api_response(true, "Berhasil menghapus {$deleted} log lama (>{$days} hari).", ['deleted' => $deleted]);
            break;
            
        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (PDOException $e) {
    error_log("Database Error in activity_logs.php: " . $e->getMessage());
    api_response(false, "Kesalahan server database.", null, 500);
}
?>