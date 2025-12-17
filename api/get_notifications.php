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

// Get unread notifications count
$count_result = $conn->query("SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $user_id AND is_read = FALSE");
$unread_count = $count_result->fetch_assoc()['unread_count'];

// Get notifications
$result = $conn->query("
    SELECT n.*, 
           a.sender_user_id,
           u.username as sender_name
    FROM notifications n
    LEFT JOIN announcements a ON n.related_id = a.id AND n.type = 'announcement'
    LEFT JOIN users u ON a.sender_user_id = u.id
    WHERE n.user_id = $user_id 
    ORDER BY n.created_at DESC 
    LIMIT 50
");

$notifications = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $notifications[] = [
            'id' => $row['id'],
            'title' => $row['title'],
            'message' => $row['message'],
            'type' => $row['type'],
            'is_read' => (bool)$row['is_read'],
            'created_at' => $row['created_at'],
            'sender' => $row['sender_name'] ?? 'System'
        ];
    }
}

echo json_encode([
    'success' => true, 
    'notifications' => $notifications,
    'unread_count' => $unread_count
]);
?>