<?php
// api/update_profile.php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$user_id = $_SESSION['user']['id'];

// Sanitize and validate
$name       = trim($input['name'] ?? '');
$email      = trim($input['email'] ?? '');
$phone      = trim($input['phone'] ?? '');
$address    = trim($input['address'] ?? '');
$dob        = $input['dob'] ?? '';
$blood_type = trim($input['blood_type'] ?? '');

if (empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Name is required']);
    exit;
}

// Optional: Add more validation (email format, phone length, etc.)

$stmt = $conn->prepare("
    UPDATE patients 
    SET name = ?, email = ?, phone = ?, address = ?, dob = ?, blood_type = ?
    WHERE user_id = ?
");

$stmt->bind_param("ssssssi", $name, $email, $phone, $address, $dob, $blood_type, $user_id);

if ($stmt->execute()) {
    // Update session name for immediate UI refresh
    $_SESSION['user']['name'] = $name;

    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update profile'
    ]);
}

$stmt->close();
?>