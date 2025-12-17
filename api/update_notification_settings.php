<?php
// api/update_notification_settings.php
session_start();
require 'config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'system_admin') {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit();
}

try {
    $settings_to_update = [
        'enable_push_notifications' => isset($input['pushNotifications']) ? '1' : '0',
        'enable_sound_notifications' => isset($input['soundNotifications']) ? '1' : '0'
    ];
    
    foreach ($settings_to_update as $key => $value) {
        $stmt = $conn->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?");
        $stmt->bind_param("sss", $key, $value, $value);
        $stmt->execute();
        $stmt->close();
    }
    
    // Add audit log
    $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip) VALUES (?, 'Notification Settings Updated', ?, ?)");
    $target = "Notification Settings";
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_stmt->bind_param("iss", $_SESSION['user']['id'], $target, $ip);
    $log_stmt->execute();
    $log_stmt->close();
    
    echo json_encode(["success" => true, "message" => "Notification settings updated"]);
    
} catch (Exception $e) {
    error_log("Notification settings update error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Update failed: " . $e->getMessage()]);
}
?>