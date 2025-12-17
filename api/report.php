<?php
/**
 * =========================================================
 * FILE: api/report.php - COMPLETE FIXED VERSION
 * Enhanced with Owner Dashboard Backend Functions
 * =========================================================
 */

session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// ========================================
// BACKEND FUNCTIONS FOR OWNER DASHBOARD
// ========================================

function getTotalStock($pdo) {
    try {
        $stmt = $pdo->query("SELECT SUM(current_stock) as total FROM items WHERE is_approved = TRUE");
        return (int)($stmt->fetchColumn() ?? 0);
    } catch (Exception $e) {
        error_log("getTotalStock error: " . $e->getMessage());
        return 0;
    }
}

function getTotalApprovedItems($pdo) {
    try {
        $stmt = $pdo->query("SELECT COUNT(id) as total FROM items WHERE is_approved = TRUE");
        return (int)($stmt->fetchColumn() ?? 0);
    } catch (Exception $e) {
        error_log("getTotalApprovedItems error: " . $e->getMessage());
        return 0;
    }
}

function calculateStockTurnover($pdo, $period) {
    try {
        // Get months count based on period
        $months = match($period) {
            '1month' => 1,
            '3months' => 3,
            '6months' => 6,
            '1year' => 12,
            default => 6
        };
        
        // Calculate average stock
        $stmt = $pdo->query("SELECT AVG(current_stock) as avg_stock FROM items WHERE is_approved = TRUE");
        $avgStock = (float)($stmt->fetchColumn() ?? 1);
        
        // Calculate total outflow
        $stmt = $pdo->prepare("
            SELECT SUM(quantity) as total_out 
            FROM transactions 
            WHERE type = 'OUT' 
            AND status = 'APPROVED'
            AND approval_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        ");
        $stmt->execute([$months]);
        $totalOut = (float)($stmt->fetchColumn() ?? 0);
        
        // Calculate turnover rate
        if ($avgStock > 0) {
            return round(($totalOut / $avgStock) / $months, 2);
        }
        return 0;
    } catch (Exception $e) {
        error_log("calculateStockTurnover error: " . $e->getMessage());
        return 0;
    }
}

function calculateFulfillmentRate($pdo, $period) {
    try {
        $months = match($period) {
            '1month' => 1,
            '3months' => 3,
            '6months' => 6,
            '1year' => 12,
            default => 6
        };
        
        // Total approved OUT transactions
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM transactions 
            WHERE type = 'OUT'
            AND request_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        ");
        $stmt->execute([$months]);
        $totalRequests = (int)$stmt->fetchColumn();
        
        // Approved transactions
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as approved 
            FROM transactions 
            WHERE type = 'OUT' 
            AND status = 'APPROVED'
            AND request_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        ");
        $stmt->execute([$months]);
        $approved = (int)$stmt->fetchColumn();
        
        if ($totalRequests > 0) {
            return round(($approved / $totalRequests) * 100, 1);
        }
        return 100.0;
    } catch (Exception $e) {
        error_log("calculateFulfillmentRate error: " . $e->getMessage());
        return 0;
    }
}

function getStockTrend($pdo, $period) {
    try {
        $months = match($period) {
            '1month' => 1,
            '3months' => 3,
            '6months' => 6,
            '1year' => 12,
            default => 6
        };
        
        $trend = [];
        
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = date('M', strtotime("-$i months"));
            $monthStart = date('Y-m-01', strtotime("-$i months"));
            $monthEnd = date('Y-m-t', strtotime("-$i months"));
            
            // Calculate stock at end of month (approximation)
            $stmt = $pdo->prepare("
                SELECT 
                    (SELECT COALESCE(SUM(current_stock), 0) FROM items WHERE is_approved = TRUE) as stock,
                    (SELECT COALESCE(SUM(quantity), 0) FROM transactions 
                     WHERE type = 'IN' AND status = 'APPROVED' 
                     AND approval_date BETWEEN ? AND ?) as inflow,
                    (SELECT COALESCE(SUM(quantity), 0) FROM transactions 
                     WHERE type = 'OUT' AND status = 'APPROVED' 
                     AND approval_date BETWEEN ? AND ?) as outflow
            ");
            $stmt->execute([$monthStart, $monthEnd, $monthStart, $monthEnd]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $trend[] = [
                'month' => $month,
                'stock' => (int)$data['stock'],
                'inflow' => (int)$data['inflow'],
                'outflow' => (int)$data['outflow']
            ];
        }
        
        return $trend;
    } catch (Exception $e) {
        error_log("getStockTrend error: " . $e->getMessage());
        return [];
    }
}

function getTransactionVolume($pdo, $period) {
    try {
        $months = match($period) {
            '1month' => 1,
            '3months' => 3,
            '6months' => 6,
            '1year' => 12,
            default => 6
        };
        
        $volume = [];
        
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = date('M', strtotime("-$i months"));
            $monthStart = date('Y-m-01', strtotime("-$i months"));
            $monthEnd = date('Y-m-t', strtotime("-$i months"));
            
            $stmt = $pdo->prepare("
                SELECT 
                    status,
                    COUNT(*) as count
                FROM transactions
                WHERE approval_date BETWEEN ? AND ?
                   OR (status = 'PENDING' AND request_date BETWEEN ? AND ?)
                GROUP BY status
            ");
            $stmt->execute([$monthStart, $monthEnd, $monthStart, $monthEnd]);
            $statuses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            $volume[] = [
                'month' => $month,
                'approved' => (int)($statuses['APPROVED'] ?? 0),
                'rejected' => (int)($statuses['REJECTED'] ?? 0),
                'pending' => (int)($statuses['PENDING'] ?? 0)
            ];
        }
        
        return $volume;
    } catch (Exception $e) {
        error_log("getTransactionVolume error: " . $e->getMessage());
        return [];
    }
}

function getSupplierBreakdown($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                s.name,
                SUM(i.current_stock) as value
            FROM items i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.is_approved = TRUE
            GROUP BY s.id, s.name
            ORDER BY value DESC
            LIMIT 5
        ");
        
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add colors
        $colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
        foreach ($suppliers as $index => &$supplier) {
            $supplier['value'] = (int)$supplier['value'];
            $supplier['color'] = $colors[$index] ?? '#6b7280';
        }
        
        return $suppliers;
    } catch (Exception $e) {
        error_log("getSupplierBreakdown error: " . $e->getMessage());
        return [];
    }
}

function getActiveAlerts($pdo) {
    try {
        $alerts = [];
        
        // Alert 1: Critical Stock
        $stmt = $pdo->query("
            SELECT COUNT(*) as count 
            FROM items 
            WHERE is_approved = TRUE 
            AND current_stock <= min_stock
        ");
        $criticalCount = (int)$stmt->fetchColumn();
        
        if ($criticalCount > 0) {
            $alerts[] = [
                'id' => 1,
                'type' => 'critical',
                'icon' => 'AlertTriangle',
                'title' => 'Stok Kritis',
                'message' => "$criticalCount item di bawah minimum stock",
                'count' => $criticalCount,
                'action' => 'View Items'
            ];
        }
        
        // Alert 2: Pending Approvals
        $stmt = $pdo->query("SELECT COUNT(*) FROM transactions WHERE status = 'PENDING'");
        $pendingCount = (int)$stmt->fetchColumn();
        
        if ($pendingCount > 0) {
            $alerts[] = [
                'id' => 2,
                'type' => 'warning',
                'icon' => 'Clock',
                'title' => 'Pending Approvals',
                'message' => "$pendingCount transaksi menunggu approval Supervisor",
                'count' => $pendingCount,
                'action' => 'Review'
            ];
        }
        
        // Alert 3: New Supplier Requests
        $stmt = $pdo->query("SELECT COUNT(*) FROM suppliers WHERE is_active = FALSE");
        $newSuppliers = (int)$stmt->fetchColumn();
        
        if ($newSuppliers > 0) {
            $alerts[] = [
                'id' => 3,
                'type' => 'info',
                'icon' => 'Package',
                'title' => 'New Supplier Requests',
                'message' => "$newSuppliers supplier baru menunggu verifikasi",
                'count' => $newSuppliers,
                'action' => 'Check'
            ];
        }
        
        // Alert 4: Performance (calculate from last 2 months)
        $stmt = $pdo->query("
            SELECT 
                (SELECT COUNT(*) FROM transactions 
                 WHERE status = 'APPROVED' 
                 AND approval_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as current_month,
                (SELECT COUNT(*) FROM transactions 
                 WHERE status = 'APPROVED' 
                 AND approval_date >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
                 AND approval_date < DATE_SUB(NOW(), INTERVAL 1 MONTH)) as last_month
        ");
        $performance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($performance && $performance['last_month'] > 0) {
            $change = (($performance['current_month'] - $performance['last_month']) / $performance['last_month']) * 100;
            
            if ($change > 0) {
                $alerts[] = [
                    'id' => 4,
                    'type' => 'success',
                    'icon' => 'TrendingUp',
                    'title' => 'Performance Up',
                    'message' => 'Transaksi approved naik ' . round($change, 1) . '% bulan ini',
                    'count' => null,
                    'action' => 'Details'
                ];
            }
        }
        
        return $alerts;
    } catch (Exception $e) {
        error_log("getActiveAlerts error: " . $e->getMessage());
        return [];
    }
}

function getTopMovingItems($pdo, $period) {
    try {
        $months = match($period) {
            '1month' => 1,
            '3months' => 3,
            '6months' => 6,
            '1year' => 12,
            default => 6
        };
        
        $stmt = $pdo->prepare("
            SELECT 
                i.sku,
                i.name,
                COUNT(t.id) as movement,
                SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as total_out
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            WHERE t.status = 'APPROVED'
            AND t.approval_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY i.id, i.sku, i.name
            ORDER BY movement DESC
            LIMIT 5
        ");
        $stmt->execute([$months]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate trends (compare with previous period)
        foreach ($items as &$item) {
            $item['movement'] = (int)$item['movement'];
            $item['trend'] = 'stable';
            $item['change'] = '0%';
            
            // Simple trend calculation (you can enhance this)
            $prevStmt = $pdo->prepare("
                SELECT COUNT(*) as prev_movement
                FROM transactions t
                JOIN items i ON t.item_id = i.id
                WHERE i.sku = ?
                AND t.status = 'APPROVED'
                AND t.approval_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                AND t.approval_date < DATE_SUB(NOW(), INTERVAL ? MONTH)
            ");
            $prevStmt->execute([$item['sku'], $months * 2, $months]);
            $prevMovement = (int)$prevStmt->fetchColumn();
            
            if ($prevMovement > 0) {
                $percentChange = (($item['movement'] - $prevMovement) / $prevMovement) * 100;
                
                if ($percentChange > 5) {
                    $item['trend'] = 'up';
                    $item['change'] = '+' . round($percentChange, 0) . '%';
                } elseif ($percentChange < -5) {
                    $item['trend'] = 'down';
                    $item['change'] = round($percentChange, 0) . '%';
                }
            } elseif ($item['movement'] > 0) {
                $item['trend'] = 'up';
                $item['change'] = '+100%';
            }
        }
        
        return $items;
    } catch (Exception $e) {
        error_log("getTopMovingItems error: " . $e->getMessage());
        return [];
    }
}

// ========================================
// SECURITY CHECK
// ========================================

if (!isset($_SESSION['user'])) {
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

$allowed_roles = ['owner', 'staff', 'supervisor'];
if (!in_array($user_role, $allowed_roles)) {
    api_response(false, "Otorisasi ditolak.", null, 403);
}

// ========================================
// REQUEST HANDLER (FIXED)
// ========================================

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'summary';

    try {
        // =============================================================
        // ENDPOINT STAFF
        // =============================================================
        if ($user_role === 'staff') {
            
            if ($action === 'staff_summary') {
                $stats = [];
                
                // Helper function untuk query aman
                // Mencegah crash jika query gagal (misal tabel/kolom tidak ada)
                $safeCount = function($pdo, $sql) {
                    $stmt = $pdo->query($sql);
                    if ($stmt === false) return 0; // Return 0 jika query error
                    return (int)$stmt->fetchColumn();
                };

                // Gunakan safeCount alih-alih langsung query
                $stats['total_items'] = $safeCount($pdo, "SELECT COUNT(id) FROM items WHERE is_approved = TRUE");
                $stats['pending_in']  = $safeCount($pdo, "SELECT COUNT(id) FROM transactions WHERE type = 'IN' AND status = 'PENDING'");
                $stats['pending_out'] = $safeCount($pdo, "SELECT COUNT(id) FROM transactions WHERE type = 'OUT' AND status = 'PENDING'");
                
                $count_items     = $safeCount($pdo, "SELECT COUNT(id) FROM items WHERE is_approved = FALSE");
                // Cek apakah tabel suppliers punya is_active, jika error dianggap 0
                $count_suppliers = $safeCount($pdo, "SELECT COUNT(id) FROM suppliers WHERE is_active = FALSE");
                
                $stats['pending_new_masters'] = $count_items + $count_suppliers;

                api_response(true, "Ringkasan data staff dashboard berhasil diambil.", $stats);
            }
            
            if ($action === 'staff_history') {
                // ... (kode staff_history tetap sama) ...
                $sql = "
                    SELECT 
                        t.transaction_code, t.type, t.quantity, t.status,
                        t.request_date, t.approval_date,
                        i.name AS item_name, i.sku,
                        s.name AS supplier_name,
                        u_app.username AS approver
                    FROM transactions t
                    JOIN items i ON t.item_id = i.id
                    LEFT JOIN suppliers s ON t.supplier_id = s.id
                    LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
                    WHERE t.request_by_user_id = ?
                    ORDER BY t.request_date DESC
                    LIMIT 20
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id]);
                $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Riwayat transaksi Staff berhasil diambil.", $history);
            }
        }
        
        // ... (Bagian Supervisor & Owner biarkan tetap sama) ...
        elseif ($user_role === 'owner' || $user_role === 'supervisor') {
             // ... paste kode supervisor/owner dashboard yang lama di sini ...
             // (Supaya jawaban tidak terlalu panjang, bagian ini tidak saya ubah dari file asli Anda)
             
            if ($action === 'summary') {
                $stats = [];
                $stmt = $pdo->query("SELECT SUM(current_stock) as total_stock, COUNT(id) as total_items FROM items WHERE is_approved = TRUE");
                $stock_data = $stmt->fetch();
                $stats['total_stock'] = (int)($stock_data['total_stock'] ?? 0);
                $stats['total_items'] = (int)($stock_data['total_items'] ?? 0);
                
                // ... lanjutkan logika summary owner ...
                // ... (Logika Summary Anda sebelumnya) ...
                $stmt = $pdo->query("SELECT status, COUNT(id) as count FROM transactions GROUP BY status");
                $transaction_status = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $stats['transactions'] = [
                    'pending' => (int)($transaction_status['PENDING'] ?? 0),
                    'approved' => (int)($transaction_status['APPROVED'] ?? 0),
                    'rejected' => (int)($transaction_status['REJECTED'] ?? 0),
                ];
                $stmt = $pdo->query("SELECT COUNT(id) FROM items WHERE is_approved = TRUE AND current_stock <= min_stock");
                $stats['low_stock'] = (int)$stmt->fetchColumn();
                $stmt = $pdo->query("SELECT COUNT(id) FROM items WHERE is_approved = FALSE");
                $stats['pending_items'] = (int)$stmt->fetchColumn();

                api_response(true, "Ringkasan data monitoring berhasil diambil.", $stats);
            } 
            elseif ($action === 'inventory') {
                // ... (Logika Inventory Anda sebelumnya) ...
                $sql = "SELECT i.id, i.sku, i.name AS item_name, i.unit, i.current_stock, i.min_stock, i.is_approved, s.name AS supplier_name FROM items i JOIN suppliers s ON i.supplier_id = s.id ORDER BY s.name ASC, i.name ASC";
                $stmt = $pdo->query($sql);
                api_response(true, "Laporan inventaris berhasil.", $stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            elseif ($action === 'owner_dashboard') {
                // ... (Logika Dashboard Owner Anda sebelumnya) ...
                 $period = $_GET['period'] ?? '6months';
                 $dashboardData = [
                    'kpis' => [
                        'totalStock' => getTotalStock($pdo),
                        'totalItems' => getTotalApprovedItems($pdo),
                        'totalSuppliers' => (int)$pdo->query("SELECT COUNT(*) FROM suppliers WHERE is_active = TRUE")->fetchColumn(),
                        'pendingApprovals' => (int)$pdo->query("SELECT COUNT(*) FROM transactions WHERE status = 'PENDING'")->fetchColumn(),
                        'stockTurnover' => calculateStockTurnover($pdo, $period),
                        'fulfillmentRate' => calculateFulfillmentRate($pdo, $period)
                    ],
                    // ... (Sisanya sama) ...
                    'trends' => ['stockTrend' => getStockTrend($pdo, $period), 'transactionVolume' => getTransactionVolume($pdo, $period)],
                    'supplierBreakdown' => getSupplierBreakdown($pdo),
                    'alerts' => getActiveAlerts($pdo),
                    'topMovingItems' => getTopMovingItems($pdo, $period)
                 ];
                 api_response(true, "Dashboard data retrieved successfully", $dashboardData);
            }
            elseif ($action === 'history') {
                // ... (Logika History Anda dengan perbaikan try-catch dari pertanyaan sebelumnya) ...
                 $sql = "SELECT t.id, t.transaction_code, t.type, t.quantity, t.note, t.status, t.request_date, t.approval_date, t.nota_hash, t.recipient_name, t.recipient_address, i.name AS item_name, i.sku, i.unit, u_req.username AS requester, u_app.username AS approver, s.name AS supplier_name FROM transactions t JOIN items i ON t.item_id = i.id JOIN users u_req ON t.request_by_user_id = u_req.id LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id LEFT JOIN suppliers s ON t.supplier_id = s.id ORDER BY t.request_date DESC LIMIT 50";
                 $stmt = $pdo->query($sql);
                 $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
                 // Compatibility fix
                 foreach ($history as &$row) {
                    $row['requester_name'] = $row['requester'];
                    $row['approver_name'] = $row['approver'];
                 }
                 api_response(true, "Riwayat transaksi lengkap berhasil diambil.", $history);
            }
            else {
                api_response(false, "Aksi laporan tidak valid.", null, 400);
            }
        }

    } catch (\Throwable $e) { 
        // ✅ GANTI DARI \PDOException KE \Throwable 
        // Ini akan menangkap 'Fatal Error' jika query gagal total
        error_log("Critical Error in report.php: " . $e->getMessage());
        api_response(false, "Server Error: " . $e->getMessage(), null, 500);
    }
} else {
    api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
}
?>