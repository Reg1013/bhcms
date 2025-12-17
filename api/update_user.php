<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if ($_SESSION['user']['user_type'] !== 'system_admin') die(json_encode(["success"=>false,"message"=>"Unauthorized"]));

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? 0;
$name = trim($input['fullName'] ?? '');
$username = trim($input['username'] ?? '');
$role = $input['role'] ?? '';
$status = $input['status'] ?? '';

if (!$id || empty($name) || empty($username) || empty($role)) {
    echo json_encode(["success" => false, "message" => "Invalid data"]);
    exit();
}

// Prevent changing own account to inactive or different role
if ($id == $_SESSION['user']['id']) {
    echo json_encode(["success" => false, "message" => "Cannot modify your own account"]);
    exit();
}

// Check username conflict
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
$stmt->bind_param("si", $username, $id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "Username already taken"]);
    exit();
}

$stmt = $conn->prepare("UPDATE users SET name=?, username=?, user_type=?, status=? WHERE id=?");
$stmt->bind_param("ssssi", $name, $username, $role, $status, $id);

if ($stmt->execute()) {
    $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip_address) VALUES (?, 'User Updated', ?, ?)");
    $target = "User ID: $id";
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $log_stmt->bind_param("iss", $_SESSION['user']['id'], $target, $ip);
    $log_stmt->execute();

    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Update failed"]);
}
?>