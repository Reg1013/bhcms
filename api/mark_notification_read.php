<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user']['id'];
$payload = json_decode(file_get_contents('php://input'), true);

if (isset($payload['notification_id'])) {
    // Mark single notification as read
    $notification_id = (int)$payload['notification_id'];
    $conn->query("UPDATE notifications SET is_read = TRUE WHERE id = $notification_id AND user_id = $user_id");
} else {
    // Mark all notifications as read
    $conn->query("UPDATE notifications SET is_read = TRUE WHERE user_id = $user_id");
}

echo json_encode(['success' => true]);
?>