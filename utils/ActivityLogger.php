<?php
/**
 * =========================================================
 * ACTIVITY LOGGER MODULE - Complete Implementation
 * File: utils/ActivityLogger.php
 * Usage: Include in all API files that need logging
 * =========================================================
 */

class ActivityLogger {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Log user activity to database
     * 
     * @param int $user_id User ID from session
     * @param string $username Username from session
     * @param string $action Action type (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, APPROVE, REJECT, VIEW)
     * @param string $description Detailed description of action
     * @param array $metadata Optional additional data (stored as JSON)
     * @return bool Success status
     */
    public function log($user_id, $username, $action, $description, $metadata = null) {
        try {
            // Get client IP address
            $ip = $this->getClientIP();
            
            // Prepare metadata as JSON if provided
            $meta_json = $metadata ? json_encode($metadata) : null;
            
            // Insert log entry
            $sql = "INSERT INTO activity_logs 
                    (user_id, username, action, description, metadata, ip_address) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                $user_id,
                $username,
                strtoupper($action),
                $description,
                $meta_json,
                $ip
            ]);
            
            return $result;
            
        } catch (PDOException $e) {
            // Log to file if database logging fails (failsafe)
            error_log("ActivityLogger Error: " . $e->getMessage());
            error_log("Failed to log: User=$username, Action=$action");
            return false;
        }
    }
    
    /**
     * Get recent activity logs
     * 
     * @param int $limit Number of logs to retrieve
     * @param int $user_id Optional: filter by specific user
     * @return array Array of log entries
     */
    public function getRecentLogs($limit = 50, $user_id = null) {
        try {
            $sql = "SELECT 
                        al.*,
                        u.role as user_role
                    FROM activity_logs al
                    JOIN users u ON al.user_id = u.id";
            
            if ($user_id) {
                $sql .= " WHERE al.user_id = ?";
            }
            
            $sql .= " ORDER BY al.created_at DESC LIMIT ?";
            
            $stmt = $this->pdo->prepare($sql);
            
            if ($user_id) {
                $stmt->execute([$user_id, $limit]);
            } else {
                $stmt->execute([$limit]);
            }
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("ActivityLogger Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get activity statistics
     * 
     * @param string $period Period to analyze (today, week, month)
     * @return array Statistics data
     */
    public function getStats($period = 'today') {
        try {
            $where = $this->getPeriodWhere($period);
            
            // Action count by type
            $sql = "SELECT 
                        action,
                        COUNT(*) as count
                    FROM activity_logs
                    WHERE $where
                    GROUP BY action
                    ORDER BY count DESC";
            
            $stmt = $this->pdo->query($sql);
            $action_stats = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            // Activity by user
            $sql = "SELECT 
                        username,
                        COUNT(*) as count
                    FROM activity_logs
                    WHERE $where
                    GROUP BY username
                    ORDER BY count DESC
                    LIMIT 10";
            
            $stmt = $this->pdo->query($sql);
            $user_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Total activities
            $sql = "SELECT COUNT(*) as total FROM activity_logs WHERE $where";
            $stmt = $this->pdo->query($sql);
            $total = $stmt->fetchColumn();
            
            return [
                'total' => $total,
                'by_action' => $action_stats,
                'by_user' => $user_stats,
                'period' => $period
            ];
            
        } catch (PDOException $e) {
            error_log("ActivityLogger Error: " . $e->getMessage());
            return ['total' => 0, 'by_action' => [], 'by_user' => []];
        }
    }
    
    /**
     * Search logs with filters
     * 
     * @param array $filters Associative array of filters
     * @return array Filtered log entries
     */
    public function search($filters) {
        try {
            $sql = "SELECT al.*, u.role as user_role 
                    FROM activity_logs al
                    JOIN users u ON al.user_id = u.id
                    WHERE 1=1";
            
            $params = [];
            
            // Filter by user
            if (!empty($filters['user_id'])) {
                $sql .= " AND al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            // Filter by action
            if (!empty($filters['action'])) {
                $sql .= " AND al.action = ?";
                $params[] = strtoupper($filters['action']);
            }
            
            // Filter by date range
            if (!empty($filters['date_from'])) {
                $sql .= " AND DATE(al.created_at) >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $sql .= " AND DATE(al.created_at) <= ?";
                $params[] = $filters['date_to'];
            }
            
            // Search in description
            if (!empty($filters['search'])) {
                $sql .= " AND al.description LIKE ?";
                $params[] = "%{$filters['search']}%";
            }
            
            $sql .= " ORDER BY al.created_at DESC LIMIT 100";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("ActivityLogger Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Clean old logs (data retention)
     * Call this periodically via cron job
     * 
     * @param int $days Keep logs for X days
     * @return int Number of deleted records
     */
    public function cleanOldLogs($days = 90) {
        try {
            $sql = "DELETE FROM activity_logs 
                    WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$days]);
            
            return $stmt->rowCount();
            
        } catch (PDOException $e) {
            error_log("ActivityLogger Error: " . $e->getMessage());
            return 0;
        }
    }
    
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    
    private function getClientIP() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            return $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        }
    }
    
    private function getPeriodWhere($period) {
        switch ($period) {
            case 'today':
                return "DATE(created_at) = CURDATE()";
            case 'week':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case 'month':
                return "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            default:
                return "1=1";
        }
    }
}

/**
 * =========================================================
 * USAGE EXAMPLES
 * =========================================================
 */

/*
// In api/auth.php (LOGIN):
include('../utils/ActivityLogger.php');
$logger = new ActivityLogger($pdo);

if (login_successful) {
    $logger->log(
        $user['id'],
        $user['username'],
        'LOGIN',
        "User logged in as {$user['role']}",
        ['role' => $user['role'], 'login_time' => date('Y-m-d H:i:s')]
    );
}

// In api/approval.php (APPROVE TRANSACTION):
$logger->log(
    $user_id,
    $username,
    'APPROVE',
    "Approved transaction {$transaction_code}",
    [
        'transaction_id' => $id,
        'transaction_code' => $transaction_code,
        'type' => $type,
        'item_id' => $item_id,
        'quantity' => $quantity
    ]
);

// In api/admin_user.php (CREATE USER):
$logger->log(
    $admin_id,
    $admin_username,
    'CREATE',
    "Created new user: {$new_username} with role {$role}",
    [
        'new_user_id' => $new_user_id,
        'new_username' => $new_username,
        'role' => $role
    ]
);

// In api/admin_user.php (DELETE/DEACTIVATE):
$logger->log(
    $admin_id,
    $admin_username,
    'DEACTIVATE',
    "Deactivated user: {$target_username}",
    ['target_user_id' => $target_id]
);
*/
?>