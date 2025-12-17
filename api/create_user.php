<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if ($_SESSION['user']['user_type'] !== 'system_admin') {
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

$fullName = trim($input['fullName'] ?? '');
$username = trim($input['username'] ?? '');
$role     = $input['role'] ?? '';
$status   = $input['status'] ?? 'Active';
$password = $username . '123'; // default password

if (empty($fullName) || empty($username) || empty($role)) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit();
}

// Check if username exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "Username already taken"]);
    exit();
}
$stmt->close();

$hashed = password_hash($password, PASSWORD_DEFAULT);
$created_by = $_SESSION['user']['id'];

$stmt = $conn->prepare("INSERT INTO users (username, password, name, user_type, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
$stmt->bind_param("sssssi", $username, $hashed, $fullName, $role, $status, $created_by);

if ($stmt->execute()) {
    // Log audit
    $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip_address) VALUES (?, 'User Created', ?, ?)");
    $target = "User: $username";
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_stmt->bind_param("iss", $_SESSION['user']['id'], $target, $ip);
    $log_stmt->execute();
    $log_stmt->close();

    echo json_encode(["success" => true, "message" => "User created. Default password: $password"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to create user"]);
}
?>