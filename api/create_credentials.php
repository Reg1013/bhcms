<?php
// api/create_credentials.php - FIXED VERSION
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

ob_start();
session_start();
require 'config.php';

header('Content-Type: application/json');

// ========== AUTHENTICATION ==========
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'bhw') {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

$creator_id = $_SESSION['user']['id'];

// ========== GET INPUT ==========
$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

$users = $input['users'] ?? [];
$requestId = $input['requestId'] ?? uniqid();

if (!is_array($users) || empty($users)) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'No users provided']);
    exit;
}

// ========== LIMIT BATCH SIZE ==========
$maxBatchSize = 100;
if (count($users) > $maxBatchSize) {
    ob_end_clean();
    echo json_encode([
        'success' => false, 
        'message' => "Batch too large. Maximum {$maxBatchSize} users per request.",
        'suggested_action' => 'Split into multiple batches'
    ]);
    exit;
}

// ========== BULK PROCESSING ==========
$created = 0;
$errors = [];
$start_time = microtime(true);

// Map role to user_type
$role_to_type = [
    'doctor' => 'health_worker',
    'midwife' => 'health_worker',
    'nurse' => 'health_worker',
    'patient' => 'patient',
    'bhw' => 'bhw',
    'barangay_health' => 'bhw',
    'health personnel' => 'bhw',
    'health_worker' => 'health_worker'
];

// Begin transaction
$conn->begin_transaction();

try {
    // Prepare statements
    $user_stmt = $conn->prepare("
        INSERT INTO users (username, name, password, user_type, status, created_by, created_at)
        VALUES (?, ?, ?, ?, 'Active', ?, NOW())
    ");
    
    // Check if patients table exists and has correct columns
    $check_patients = $conn->query("SHOW TABLES LIKE 'patients'");
    $patients_exists = $check_patients && $check_patients->num_rows > 0;
    
    if ($patients_exists) {
        // Check patients table columns
        $patients_columns = $conn->query("SHOW COLUMNS FROM patients");
        $patient_has_address = false;
        while ($col = $patients_columns->fetch_assoc()) {
            if (strtolower($col['Field']) === 'address') {
                $patient_has_address = true;
                break;
            }
        }
        
        if ($patient_has_address) {
            $patient_stmt = $conn->prepare("INSERT INTO patients (user_id, name, address) VALUES (?, ?, ?)");
        } else {
            $patient_stmt = $conn->prepare("INSERT INTO patients (user_id, name) VALUES (?, ?)");
        }
    }
    
    // Check health_workers table
    $check_health_workers = $conn->query("SHOW TABLES LIKE 'health_workers'");
    $health_workers_exists = $check_health_workers && $check_health_workers->num_rows > 0;
    
    if ($health_workers_exists) {
        // Check health_workers table columns
        $hw_columns = $conn->query("SHOW COLUMNS FROM health_workers");
        $hw_columns_list = [];
        while ($col = $hw_columns->fetch_assoc()) {
            $hw_columns_list[] = strtolower($col['Field']);
        }
        
        if (in_array('address', $hw_columns_list)) {
            $health_worker_stmt = $conn->prepare("INSERT INTO health_workers (user_id, name, specialty, address) VALUES (?, ?, ?, ?)");
        } else {
            $health_worker_stmt = $conn->prepare("INSERT INTO health_workers (user_id, name, specialty) VALUES (?, ?, ?)");
        }
    }
    
    // Check bhw_personnel table
    $check_bhw = $conn->query("SHOW TABLES LIKE 'bhw_personnel'");
    $bhw_exists = $check_bhw && $check_bhw->num_rows > 0;
    
    if ($bhw_exists) {
        // Check bhw_personnel table columns
        $bhw_columns = $conn->query("SHOW COLUMNS FROM bhw_personnel");
        $bhw_columns_list = [];
        while ($col = $bhw_columns->fetch_assoc()) {
            $bhw_columns_list[] = strtolower($col['Field']);
        }
        
        // Your bhw_personnel has: id, user_id, name, address, status
        if (in_array('address', $bhw_columns_list)) {
            $bhw_stmt = $conn->prepare("INSERT INTO bhw_personnel (user_id, name, address, status) VALUES (?, ?, ?, 'Active')");
        } else {
            $bhw_stmt = $conn->prepare("INSERT INTO bhw_personnel (user_id, name, status) VALUES (?, ?, 'Active')");
        }
    }
    
    $check_username_stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    
    foreach ($users as $index => $userData) {
        $name = trim($userData['name'] ?? '');
        $address = trim($userData['address'] ?? '');
        $role = strtolower(trim($userData['role'] ?? ''));
        $username = trim($userData['username'] ?? '');
        $password = $userData['password'] ?? '';
        
        // Skip if any required field is empty
        if (empty($name) || empty($username) || empty($password) || empty($role)) {
            $errors[] = "Row " . ($index + 1) . ": Missing required fields";
            continue;
        }
        
        // Check if username exists
        $check_username_stmt->bind_param("s", $username);
        $check_username_stmt->execute();
        $check_username_stmt->store_result();
        
        if ($check_username_stmt->num_rows > 0) {
            $errors[] = "Row " . ($index + 1) . ": Username '$username' already exists";
            $check_username_stmt->free_result();
            continue;
        }
        $check_username_stmt->free_result();
        
        // Determine user type
        $user_type = $role_to_type[$role] ?? 'patient';
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert into users table
        $user_stmt->bind_param("ssssi", $username, $name, $hashed_password, $user_type, $creator_id);
        
        if (!$user_stmt->execute()) {
            if ($conn->errno == 1062) {
                $errors[] = "Row " . ($index + 1) . ": Username '$username' already exists";
            } else {
                $errors[] = "Row " . ($index + 1) . ": Failed to create user - " . $conn->error;
            }
            continue;
        }
        
        $user_id = $conn->insert_id;
        $created++;
        
        // Insert into profile table based on user type
        switch ($user_type) {
            case 'patient':
                if ($patients_exists && isset($patient_stmt)) {
                    if (strpos($patient_stmt->param_count, '3') !== false) {
                        // Has address parameter
                        $patient_stmt->bind_param("iss", $user_id, $name, $address);
                    } else {
                        // No address parameter
                        $patient_stmt->bind_param("is", $user_id, $name);
                    }
                    if (!$patient_stmt->execute()) {
                        $errors[] = "Row " . ($index + 1) . ": Failed to create patient profile";
                    }
                }
                break;
                
            case 'health_worker':
                if ($health_workers_exists && isset($health_worker_stmt)) {
                    if (strpos($health_worker_stmt->param_count, '4') !== false) {
                        // Has address parameter
                        $health_worker_stmt->bind_param("isss", $user_id, $name, $role, $address);
                    } else {
                        // No address parameter
                        $health_worker_stmt->bind_param("iss", $user_id, $name, $role);
                    }
                    if (!$health_worker_stmt->execute()) {
                        $errors[] = "Row " . ($index + 1) . ": Failed to create health worker profile";
                    }
                }
                break;
                
            case 'bhw':
                if ($bhw_exists && isset($bhw_stmt)) {
                    if (strpos($bhw_stmt->param_count, '3') !== false) {
                        // Has address parameter
                        $bhw_stmt->bind_param("iss", $user_id, $name, $address);
                    } else {
                        // No address parameter
                        $bhw_stmt->bind_param("is", $user_id, $name);
                    }
                    if (!$bhw_stmt->execute()) {
                        $errors[] = "Row " . ($index + 1) . ": Failed to create BHW profile";
                    }
                }
                break;
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    // Close prepared statements
    $user_stmt->close();
    if (isset($patient_stmt)) $patient_stmt->close();
    if (isset($health_worker_stmt)) $health_worker_stmt->close();
    if (isset($bhw_stmt)) $bhw_stmt->close();
    $check_username_stmt->close();
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    $errors[] = "Database error: " . $e->getMessage();
}

// Calculate execution time
$end_time = microtime(true);
$execution_time = round($end_time - $start_time, 3);

// ========== RESPONSE ==========
$response = [
    'success' => $created > 0,
    'created' => $created,
    'total' => count($users),
    'errors' => $errors,
    'execution_time' => $execution_time . ' seconds',
    'request_id' => $requestId
];

if ($created > 0) {
    $response['message'] = "Successfully created $created user(s) in {$execution_time} seconds";
} else {
    $response['message'] = "Failed to create users";
    if (!empty($errors)) {
        $response['message'] .= ": " . $errors[0];
    }
}

ob_end_clean();
echo json_encode($response);
?>