<?php
// api/update_system_info.php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit();
}

if ($_SESSION['user']['user_type'] !== 'system_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. System admin only.']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    exit();
}

require 'config.php';

try {
    $conn->begin_transaction();
    $user_id = $_SESSION['user']['id'];
    
    // Update user info (only name, email, username)
    $stmt = $conn->prepare("UPDATE users SET name = ?, email = ?, username = ? WHERE id = ?");
    $stmt->bind_param("sssi", 
        $input['adminName'],
        $input['adminEmail'],
        $input['adminUsername'],
        $user_id
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update user: " . $stmt->error);
    }
    $stmt->close();
    
    // Update session
    $_SESSION['user']['name'] = $input['adminName'];
    $_SESSION['user']['email'] = $input['adminEmail'];
    $_SESSION['user']['username'] = $input['adminUsername'];
    
    // Update system info (no support_phone)
    $check_stmt = $conn->prepare("SELECT id FROM system_info LIMIT 1");
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    $check_stmt->close();
    
    if ($check_result->num_rows > 0) {
        $sys_stmt = $conn->prepare("UPDATE system_info SET 
                                   system_name = ?, 
                                   system_version = ?, 
                                   support_email = ?,
                                   updated_at = NOW() 
                                   LIMIT 1");
        $sys_stmt->bind_param("sss",
            $input['systemName'],
            $input['systemVersion'],
            $input['supportEmail']
        );
    } else {
        $sys_stmt = $conn->prepare("INSERT INTO system_info 
                                   (system_name, system_version, support_email, created_at, updated_at) 
                                   VALUES (?, ?, ?, NOW(), NOW())");
        $sys_stmt->bind_param("sss",
            $input['systemName'],
            $input['systemVersion'],
            $input['supportEmail']
        );
    }
    
    if (!$sys_stmt->execute()) {
        throw new Exception("Failed to update system info: " . $sys_stmt->error);
    }
    $sys_stmt->close();
    
    // Add audit log
    $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip, timestamp) 
                               VALUES (?, 'System Info Updated', ?, ?, NOW())");
    $target = "System Configuration Updated";
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_stmt->bind_param("iss", $user_id, $target, $ip);
    $log_stmt->execute();
    $log_stmt->close();
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'System information updated successfully'
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Update failed',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>