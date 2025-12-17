<?php
// api/get_users.php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'system_admin') {
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit();
}

require 'config.php';

try {
    $result = $conn->query("SELECT id, name, username, user_type, status FROM users ORDER BY name ASC");
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode($users);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error fetching users"]);
}

if (isset($conn)) {
    $conn->close();
}
?>