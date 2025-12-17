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
$user_role = $_SESSION['user']['user_type']; // Use role instead of user_type

// For health workers, get announcements for staff and everyone
if ($user_role === 'health_worker') {
    $sql = "SELECT a.*, u.username as sender_name 
            FROM announcements a 
            JOIN users u ON a.sender_user_id = u.id 
            WHERE a.recipient_type IN ('nursing_staff', 'everyone')
            ORDER BY a.created_at DESC 
            LIMIT 10";
} 
// For patients, get announcements for patients and everyone
elseif ($user_role === 'patient') {
    $sql = "SELECT a.*, u.username as sender_name 
            FROM announcements a 
            JOIN users u ON a.sender_user_id = u.id 
            WHERE a.recipient_type IN ('all_patients', 'everyone')
            ORDER BY a.created_at DESC 
            LIMIT 10";
} 
else {
    // For other roles (bhw, system_admin)
    $sql = "SELECT a.*, u.username as sender_name 
            FROM announcements a 
            JOIN users u ON a.sender_user_id = u.id 
            WHERE a.recipient_type = 'everyone'
            ORDER BY a.created_at DESC 
            LIMIT 10";
}

$result = $conn->query($sql);
$announcements = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $announcements[] = [
            'id' => $row['id'],
            'message' => $row['message'],
            'sender' => $row['sender_name'],
            'recipient_type' => $row['recipient_type'],
            'created_at' => $row['created_at']
        ];
    }
}

echo json_encode(['success' => true, 'announcements' => $announcements]);
?>