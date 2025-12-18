<?php
/**
 * =========================================================
 * FILE: api/admin_activity.php - SECURE VERSION
 * Purpose: API for viewing and searching activity logs
 * Access: Admin only
 * =========================================================
 */

include('../config/db_config.php');
include('../utils/ActivityLogger.php');
include('../utils/SessionManager.php'); // Security Helper

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// 1. Wajib Login & Cek Timeout
SessionManager::requireAuth();

// 2. Role Check (Hanya Admin)
SessionManager::requireRole('admin');

$user = SessionManager::getUser();
$admin_id = $user['id'];
$admin_username = $user['username'];

// Initialize Logger
$logger = new ActivityLogger($pdo);

// REQUEST HANDLER
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        
        // GET: Retrieve logs
        case 'GET':
            $action = $_GET['action'] ?? 'recent';
            
            if ($action === 'recent') {
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
                $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
                $logs = $logger->getRecentLogs($limit, $user_id);
                api_response(true, "Recent activity logs retrieved.", $logs);
                
            } elseif ($action === 'stats') {
                $period = $_GET['period'] ?? 'today';
                $stats = $logger->getStats($period);
                api_response(true, "Activity statistics retrieved.", $stats);
                
            } elseif ($action === 'search') {
                $filters = [
                    'user_id' => $_GET['user_id'] ?? null,
                    'action' => $_GET['action_type'] ?? null,
                    'date_from' => $_GET['date_from'] ?? null,
                    'date_to' => $_GET['date_to'] ?? null,
                    'search' => $_GET['search'] ?? null
                ];
                
                // Remove null filters
                $filters = array_filter($filters, function($value) {
                    return $value !== null && $value !== '';
                });
                
                $logs = $logger->search($filters);
                api_response(true, "Search completed.", $logs);
                
            } elseif ($action === 'users') {
                $stmt = $pdo->query("SELECT id, username, role FROM users ORDER BY username");
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "User list retrieved.", $users);
                
            } else {
                api_response(false, "Invalid action.", null, 400);
            }
            break;
        
        // POST: Manual log entry (if needed)
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $action = $data['action'] ?? '';
            $description = $data['description'] ?? '';
            $metadata = $data['metadata'] ?? null;
            
            if (empty($action) || empty($description)) {
                api_response(false, "Action and description required.", null, 400);
            }
            
            $result = $logger->log(
                $admin_id,
                $admin_username,
                $action,
                $description,
                $metadata
            );
            
            if ($result) {
                api_response(true, "Activity logged successfully.");
            } else {
                api_response(false, "Failed to log activity.", null, 500);
            }
            break;
        
        // DELETE: Clean old logs
        case 'DELETE':
            $days = isset($_GET['days']) ? (int)$_GET['days'] : 90;
            $deleted = $logger->cleanOldLogs($days);
            
            $logger->log(
                $admin_id,
                $admin_username,
                'CLEANUP',
                "Cleaned activity logs older than {$days} days. Deleted: {$deleted} records."
            );
            
            api_response(true, "Cleaned {$deleted} old log entries.", ['deleted_count' => $deleted]);
            break;
        
        default:
            api_response(false, "Method not allowed.", null, 405);
    }
    
} catch (PDOException $e) {
    error_log("Database Error in admin_activity.php: " . $e->getMessage());
    api_response(false, "Database error occurred.", null, 500);
} catch (Exception $e) {
    error_log("General Error in admin_activity.php: " . $e->getMessage());
    api_response(false, "An error occurred.", null, 500);
}
?>