<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'health_worker') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$user_id = $_SESSION['user']['id'];

try {
    $stmt = $conn->prepare("
        SELECT hw.name, hw.specialty, hw.license_number, hw.phone, hw.shift, u.email
        FROM health_workers hw
        JOIN users u ON hw.user_id = u.id
        WHERE hw.user_id = ?
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $healthWorker = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'healthWorker' => $healthWorker
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Health worker profile not found'
        ]);
    }
    
    $stmt->close();
} catch (Exception $e) {
    error_log("Get health worker profile error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load profile'
    ]);
}
?>