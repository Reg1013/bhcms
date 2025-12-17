<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'health_worker') {
    echo json_encode(['success' => false, 'message' => 'Forbidden - Not a health worker']);
    exit;
}

require 'config.php';

$payload = json_decode(file_get_contents('php://input'), true);
$health_worker_id = $_SESSION['user']['id'];

// Get values
$patient_user_id = $payload['patient_user_id'] ?? null;
$for_whom = $payload['for_whom'] ?? '';
$type = $payload['type'] ?? '';
$date = $payload['appointment_date'] ?? $payload['date'] ?? '';
$time_input = $payload['appointment_time'] ?? $payload['time'] ?? '';

// Validate
if (empty($patient_user_id) || empty($for_whom) || empty($type) || empty($date) || empty($time_input)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

// Get health worker's database ID
$health_worker_db_id = 0;
$user_role = 'Health Worker';

$stmt = $conn->prepare("SELECT id, specialty FROM health_workers WHERE user_id = ?");
$stmt->bind_param("i", $health_worker_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result && $row = $result->fetch_assoc()) {
    $health_worker_db_id = $row['id'];
    $specialty = $row['specialty'] ?? '';
    $lower_specialty = strtolower($specialty);
    if (strpos($lower_specialty, 'doctor') !== false) {
        $user_role = 'Doctor';
    } elseif (strpos($lower_specialty, 'nurse') !== false) {
        $user_role = 'Nurse';
    } elseif (strpos($lower_specialty, 'midwife') !== false) {
        $user_role = 'Midwife';
    }
}
$stmt->close();

if ($health_worker_db_id === 0) {
    $health_worker_db_id = $health_worker_id;
}

// Parse time
$time_to_store = '09:00:00';
if (!empty($time_input)) {
    $time_input = trim($time_input);
    
    if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $time_input, $matches)) {
        $hour = intval($matches[1]);
        $minute = intval($matches[2]);
        $second = intval($matches[3]);
        
        if ($hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59 && $second >= 0 && $second <= 59) {
            $time_to_store = sprintf('%02d:%02d:%02d', $hour, $minute, $second);
        }
    } 
    elseif (preg_match('/^(\d{1,2}):(\d{2})$/', $time_input, $matches)) {
        $hour = intval($matches[1]);
        $minute = intval($matches[2]);
        
        if ($hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59) {
            $time_to_store = sprintf('%02d:%02d:00', $hour, $minute);
        }
    }
}

// Insert appointment
$sql = "INSERT INTO appointments (
            patient_user_id, 
            for_whom, 
            type, 
            appointment_date, 
            appointment_time, 
            health_worker_id, 
            assigned_health_worker_role, 
            status,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', NOW())";
    
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$stmt->bind_param("issssis", 
    $patient_user_id,
    $for_whom,
    $type,
    $date,
    $time_to_store,
    $health_worker_db_id,
    $user_role
);

if ($stmt->execute()) {
    $appointment_id = $conn->insert_id;
    
    // Create notification for patient
    $notification_sql = "INSERT INTO notifications (user_id, type, message, is_read, created_at) 
                        VALUES (?, 'appointment', ?, 0, NOW())";
    $notification_stmt = $conn->prepare($notification_sql);
    
    $message = "New appointment scheduled: $type on " . date('F j, Y', strtotime($date)) . " at " . date('g:i A', strtotime($time_to_store));
    $notification_stmt->bind_param("is", $patient_user_id, $message);
    $notification_stmt->execute();
    $notification_stmt->close();
    
    echo json_encode([
        'success' => true,
        'appointment_id' => $appointment_id,
        'message' => 'Follow-up appointment scheduled successfully'
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to schedule follow-up: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
exit;
?>