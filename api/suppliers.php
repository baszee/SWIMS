<?php
// ============================================================================
// FILE: api/suppliers.php - SUPER SIMPLE VERSION
// ============================================================================

session_start();
include('../config/db_config.php'); 

header('Content-Type: application/json');

// Simple logging function
function writeLog($message) {
    $logFile = '../logs/supplier_requests.log';
    $logDir = '../logs';
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

function api_response($success, $message, $data = null, $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

// Log request
$method = $_SERVER['REQUEST_METHOD'];
$user_info = isset($_SESSION['user']) ? $_SESSION['user']['username'] : 'NO SESSION';
writeLog("$method request from $user_info");

// ============================================================================
// SECURITY CHECK
// ============================================================================
if (!isset($_SESSION['user'])) {
    writeLog("ERROR: No session found");
    api_response(false, "Akses ditolak. Silakan login.", null, 401);
}

$user_role = $_SESSION['user']['role'];
$user_id = $_SESSION['user']['id'];

$allowed_roles = ['admin', 'staff', 'supervisor', 'owner'];
if (!in_array($user_role, $allowed_roles)) {
    writeLog("ERROR: Unauthorized role: $user_role");
    api_response(false, "Otorisasi ditolak.", null, 403);
}

writeLog("User authenticated - ID: $user_id, Role: $user_role");

// ============================================================================
// REQUEST HANDLER
// ============================================================================

try {
    switch ($method) {
        // ====================================================================
        // GET
        // ====================================================================
        case 'GET':
            $action = $_GET['action'] ?? '';
            writeLog("GET action: $action");
            
            if ($action === 'my_requests') {
                if ($user_role !== 'staff') {
                    api_response(false, "Akses hanya untuk Staff.", null, 403);
                }
                
                $sql = "SELECT id, name, contact_person, phone, address, is_active, created_at 
                        FROM suppliers 
                        WHERE created_by_user_id = ? 
                        ORDER BY created_at DESC";
                        
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id]);
                $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                writeLog("Found " . count($requests) . " requests for user $user_id");
                api_response(true, "Riwayat request supplier berhasil diambil.", $requests);
                
            } elseif ($action === 'list') {
                $stmt = $pdo->query("SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name ASC");
                $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Daftar supplier berhasil diambil.", $suppliers);
                
            } else {
                $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC");
                $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                api_response(true, "Data supplier berhasil diambil.", $suppliers);
            }
            break;

        // ====================================================================
        // POST - CREATE NEW SUPPLIER
        // ====================================================================
        case 'POST':
            writeLog("POST: Starting creation process");
            
            // Check authorization
            if ($user_role !== 'admin' && $user_role !== 'staff') {
                writeLog("POST ERROR: Unauthorized role: $user_role");
                api_response(false, "Anda tidak memiliki hak untuk menambahkan supplier.", null, 403);
            }

            // Read raw input
            $raw_input = file_get_contents("php://input");
            writeLog("POST: Raw input = " . $raw_input);
            
            // Parse JSON
            $data = json_decode($raw_input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                writeLog("POST ERROR: JSON decode error: " . json_last_error_msg());
                api_response(false, "Invalid JSON: " . json_last_error_msg(), null, 400);
            }
            
            writeLog("POST: Decoded data = " . json_encode($data));
            
            // Extract data
            $name = trim($data['name'] ?? '');
            $contact_person = trim($data['contact_person'] ?? '');
            $phone = trim($data['phone'] ?? '');
            $address = trim($data['address'] ?? '');

            writeLog("POST: Name='$name', Contact='$contact_person'");

            // Validate
            if (empty($name)) {
                writeLog("POST ERROR: Empty name");
                api_response(false, "Nama Supplier wajib diisi.", null, 400);
            }
            
            // Check duplicate
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM suppliers WHERE name = ?");
            $stmt_check->execute([$name]);
            $count = $stmt_check->fetchColumn();
            
            writeLog("POST: Duplicate check count = $count");
            
            if ($count > 0) {
                writeLog("POST ERROR: Duplicate name");
                api_response(false, "Supplier dengan nama '{$name}' sudah terdaftar.", null, 409);
            }
            
            // Set approval status
            $is_active = ($user_role === 'admin') ? 1 : 0;
            $message = ($user_role === 'admin') 
                ? "Supplier '{$name}' berhasil ditambahkan dan langsung disetujui." 
                : "Permintaan Supplier '{$name}' berhasil diajukan dan menanti persetujuan Supervisor.";

            writeLog("POST: is_active=$is_active, user_id=$user_id");

            // Insert to database
            try {
                $sql = "INSERT INTO suppliers (name, contact_person, phone, address, is_active, created_by_user_id) 
                        VALUES (?, ?, ?, ?, ?, ?)";
                        
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute([$name, $contact_person, $phone, $address, $is_active, $user_id]);
                
                if (!$result) {
                    $error = $stmt->errorInfo();
                    writeLog("POST ERROR: SQL failed - " . json_encode($error));
                    api_response(false, "Gagal menyimpan: " . $error[2], null, 500);
                }
                
                $new_id = $pdo->lastInsertId();
                writeLog("POST SUCCESS: New supplier ID = $new_id");
                
                // Verify
                $verify = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
                $verify->execute([$new_id]);
                $inserted = $verify->fetch(PDO::FETCH_ASSOC);
                writeLog("POST: Verified insertion = " . json_encode($inserted));
                
                api_response(true, $message, ['id' => $new_id, 'data' => $inserted], 201);
                
            } catch (PDOException $e) {
                writeLog("POST ERROR: PDO Exception - " . $e->getMessage());
                api_response(false, "Database error: " . $e->getMessage(), null, 500);
            }
            break;
            
        // ====================================================================
        // PUT/PATCH
        // ====================================================================
        case 'PUT':
        case 'PATCH':
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
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$name, $contact_person, $phone, $address, $is_active, $id]);

            api_response(true, "Data Supplier ID:{$id} berhasil diupdate.", null);
            break;

        // ====================================================================
        // DELETE
        // ====================================================================
        case 'DELETE':
            if ($user_role !== 'admin') {
                api_response(false, "Anda tidak memiliki hak untuk menghapus supplier.", null, 403);
            }
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                api_response(false, "ID Supplier wajib diisi untuk menghapus.", null, 400);
            }
            
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$id]);

            api_response(true, "Supplier ID:{$id} berhasil di-deactivate.", null);
            break;

        default:
            api_response(false, "Method '{$method}' tidak diizinkan.", null, 405);
    }

} catch (PDOException $e) {
    writeLog("ERROR: Database error - " . $e->getMessage());
    api_response(false, "Kesalahan database: " . $e->getMessage(), null, 500);
} catch (Exception $e) {
    writeLog("ERROR: General error - " . $e->getMessage());
    api_response(false, "Error: " . $e->getMessage(), null, 500);
}
?>