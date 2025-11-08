<?php
// api/get_profile.php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$user_id = $_SESSION['user']['id'];

$stmt = $conn->prepare("SELECT name, email, phone, address, dob, blood_type FROM patients WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'name' => $row['name'] ?? '',
        'email' => $row['email'] ?? '',
        'phone' => $row['phone'] ?? '',
        'address' => $row['address'] ?? '',
        'dob' => $row['dob'] ?? '',
        'blood_type' => $row['blood_type'] ?? ''
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Profile not found'
    ]);
}

$stmt->close();
?>