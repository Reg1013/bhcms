<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'health_worker') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$appointment_id = $input['appointment_id'] ?? null;
$new_date = $input['new_date'] ?? null;
$new_time = $input['new_time'] ?? null;

if (!$appointment_id || !$new_date || !$new_time) {
    echo json_encode(['success' => false, 'message' => 'All fields required']);
    exit;
}

$user_id = $_SESSION['user']['id'];

try {
    // Get health worker's database ID
    $health_worker_db_id = 0;
    $user_role = 'Health Worker';
    
    $stmt = $conn->prepare("SELECT id, specialty FROM health_workers WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
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
        $health_worker_db_id = $user_id;
    }
    
    // Check if appointment exists and belongs to this health worker
    // ALLOW rescheduling of ANY appointment (Scheduled, missed, etc.)
    $stmt = $conn->prepare("
        SELECT a.* 
        FROM appointments a 
        WHERE a.id = ? 
        AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)
    ");
    $stmt->bind_param("iis", $appointment_id, $health_worker_db_id, $user_role);
    $stmt->execute();
    $result = $stmt->get_result();
    $appointment = $result->fetch_assoc();
    $stmt->close();
    
    if (!$appointment) {
        echo json_encode(['success' => false, 'message' => 'Appointment not found or unauthorized']);
        exit;
    }
    
    // Update the appointment - set status back to "Scheduled" when rescheduling
    $updateStmt = $conn->prepare("
        UPDATE appointments 
        SET appointment_date = ?, appointment_time = ?, 
            status = 'Scheduled', updated_at = NOW() 
        WHERE id = ?
    ");
    $updateStmt->bind_param("ssi", $new_date, $new_time, $appointment_id);
    $success = $updateStmt->execute();
    $updateStmt->close();
    
    echo json_encode([
        'success' => $success,
        'message' => $success ? 'Appointment rescheduled successfully' : 'Failed to reschedule'
    ]);
    
} catch (Exception $e) {
    error_log("Reschedule appointment error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>