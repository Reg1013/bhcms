<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!$payload || !isset($payload['patient_id']) || !isset($payload['message'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$patient_id = (int)$payload['patient_id'];
$message = mysqli_real_escape_string($conn, $payload['message']);
$appointment_id = isset($payload['appointment_id']) ? (int)$payload['appointment_id'] : null;

// Create notification for patient
$result = $conn->query("INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (
    $patient_id,
    'Appointment Update',
    '$message',
    'appointment_updated',
    $appointment_id
)");

if ($result) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create notification']);
}
?>