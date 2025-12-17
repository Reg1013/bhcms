<?php
// api/get_system_info.php
session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit();
}

// Check if user is system admin
if ($_SESSION['user']['user_type'] !== 'system_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. System admin only.']);
    exit();
}

require 'config.php';

try {
    // Get current user ID
    $user_id = $_SESSION['user']['id'];
    
    // Get admin user info - ONLY SELECT COLUMNS THAT EXIST
    $user_info = [];
    
    // First, check what columns exist in users table
    // Let's try a safer approach - get all columns then filter
    $stmt = $conn->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Only include columns we know exist or are safe
        $user_info = [
            'name' => $row['name'] ?? '',
            'username' => $row['username'] ?? '',
            'email' => $row['email'] ?? ''
        ];
    }
    $stmt->close();
    
    // Get system info from system_info table
    $system_info = [];
    $sys_result = $conn->query("SELECT * FROM system_info ORDER BY id DESC LIMIT 1");
    
    if ($sys_result && $sys_row = $sys_result->fetch_assoc()) {
        $system_info = [
            'system_name' => $sys_row['system_name'] ?? 'BH-CMS',
            'system_version' => $sys_row['system_version'] ?? '1.0.0'
        ];
    } else {
        // Default values if no system_info record exists
        $system_info = [
            'system_name' => 'BH-CMS',
            'system_version' => '1.0.0'
        ];
    }
    
    // Return success with data
    echo json_encode([
        'success' => true,
        'user' => $user_info,
        'system' => $system_info
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching system information',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>