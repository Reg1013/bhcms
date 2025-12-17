<?php
// api/get_system_settings.php
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

// Now require config
require 'config.php';

try {
    // Get settings from database
    $settings = [];
    
    // Query settings table for specific keys
    $result = $conn->query("SELECT `key`, `value` FROM settings 
                           WHERE `key` IN ('maintenance_mode', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password')");
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $settings[$row['key']] = $row['value'];
        }
    }
    
    // Set default values for missing settings
    $defaults = [
        'maintenance_mode' => '0'
    ];
    
    foreach ($defaults as $key => $default) {
        if (!isset($settings[$key])) {
            $settings[$key] = $default;
        }
    }
    
    // Return settings
    echo json_encode($settings);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching system settings',
        'error' => $e->getMessage()
    ]);
}

// Close connection
if (isset($conn)) {
    $conn->close();
}
?>