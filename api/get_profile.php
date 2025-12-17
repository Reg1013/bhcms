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

// ✅ FIXED: Use the correct column names from your database
$stmt = $conn->prepare("SELECT name, phone, address, date_of_birth, blood_type, gender FROM patients WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'name' => $row['name'] ?? '',
        'phone' => $row['phone'] ?? '',
        'address' => $row['address'] ?? '',
        'dob' => $row['date_of_birth'] ?? '',
        'gender' => $row['gender'] ?? '', // ✅ FIXED: Changed $profile to $row
        'blood_type' => $row['blood_type'] ?? ''
    ]);
} else {
    echo json_encode([
        'success' => true,
        'name' => '',
        'phone' => '',
        'address' => '',
        'dob' => '',
        'gender' => '',
        'blood_type' => ''
    ]);
}

$stmt->close();
?>