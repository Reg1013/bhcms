<?php
// api/check_username.php - FIXED AUTH CHECK
session_start();
header('Content-Type: application/json');
require 'config.php';

// FIXED: Check for 'bhw' instead of 'barangay_health'
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'bhw') {
    echo json_encode(['exists' => false]);
    exit;
}

$username = trim($_GET['username'] ?? '');

if (empty($username)) {
    echo json_encode(['exists' => false]);
    exit;
}

// Secure query
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

echo json_encode(['exists' => $row['count'] > 0]);

$stmt->close();
?>