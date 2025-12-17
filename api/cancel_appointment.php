<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!$payload || !isset($payload['id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input: Appointment ID required']);
    exit;
}

$id = (int)$payload['id'];
$uid = $_SESSION['user']['id'];
$user_type = $_SESSION['user']['user_type'];

// Build query based on user type
if ($user_type === 'patient') {
    $sql = "UPDATE appointments SET status = 'Canceled' WHERE id = $id AND patient_user_id = $uid";
} else if ($user_type === 'health_worker') {
    $sql = "UPDATE appointments SET status = 'Canceled' WHERE id = $id AND health_worker_id = $uid";
} else {
    echo json_encode(['success' => false, 'message' => 'Unauthorized user type']);
    exit;
}

// Check if appointment exists
$check = $conn->query("SELECT id FROM appointments WHERE id = $id");
if ($check->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Appointment not found']);
    exit;
}

$upd = $conn->query($sql);

if ($upd) {
    echo json_encode(['success' => true, 'message' => 'Appointment cancelled successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to cancel appointment']);
}
?>