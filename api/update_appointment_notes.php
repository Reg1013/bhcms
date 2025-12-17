<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

require 'config.php';

$user_id = $_SESSION['user']['id'];
$user_type = $_SESSION['user']['user_type'];

// Only health workers and admins can update appointment notes
if ($user_type !== 'health_worker' && $user_type !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$appointment_id = $input['appointment_id'] ?? null;
$notes = $input['notes'] ?? '';

if (!$appointment_id) {
    echo json_encode(['success' => false, 'message' => 'Appointment ID is required']);
    exit;
}

try {
    // First, verify the health worker has permission to update this appointment
    $health_worker_db_id = 0;
    $user_role = 'Health Worker';
    
    // Get health worker's database ID
    if ($stmt = $conn->prepare("SELECT id, specialty FROM health_workers WHERE user_id = ?")) {
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result && $row = $result->fetch_assoc()) {
            $health_worker_db_id = $row['id'];
            $specialty = $row['specialty'] ?? '';
            
            // Determine role from specialty
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
    }
    
    // If we couldn't find health_workers.id, use user_id as fallback
    if ($health_worker_db_id === 0) {
        $health_worker_db_id = $user_id;
    }
    
    // Check if this appointment belongs to the health worker
    $check_sql = "SELECT id, patient_user_id FROM appointments 
                  WHERE id = ? 
                  AND (
                      health_worker_id = ? 
                      OR assigned_health_worker_role = ?
                  )
                  AND status != 'Canceled'";
    
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("iis", $appointment_id, $health_worker_db_id, $user_role);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if (!$check_result || $check_result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Appointment not found or unauthorized']);
        exit;
    }
    
    $appointment_data = $check_result->fetch_assoc();
    $patient_user_id = $appointment_data['patient_user_id'];
    $check_stmt->close();
    
    // Update the appointment notes
    $update_sql = "UPDATE appointments SET notes = ?, updated_at = NOW() WHERE id = ?";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("si", $notes, $appointment_id);
    
    if ($update_stmt->execute()) {
        // Create notification for patient
        if ($patient_user_id) {
            $notification_title = "Appointment Notes Updated";
            $notification_message = "Your health worker has added notes to your appointment.";
            
            $notification_sql = "INSERT INTO notifications (user_id, title, message, type, is_read, created_at) 
                                 VALUES (?, ?, ?, 'appointment', 0, NOW())";
            $notification_stmt = $conn->prepare($notification_sql);
            $notification_stmt->bind_param("iss", $patient_user_id, $notification_title, $notification_message);
            $notification_stmt->execute();
            $notification_stmt->close();
        }
        
        // Log the action
        $log_sql = "INSERT INTO audit_logs (user_id, action, details, created_at) 
                    VALUES (?, 'UPDATE_APPOINTMENT_NOTES', ?, NOW())";
        $log_stmt = $conn->prepare($log_sql);
        $log_details = "Updated notes for appointment #{$appointment_id}";
        $log_stmt->bind_param("is", $user_id, $log_details);
        $log_stmt->execute();
        $log_stmt->close();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Notes updated successfully',
            'appointment_id' => $appointment_id
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update notes']);
    }
    
    $update_stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    error_log("Update notes error: " . $e->getMessage());
}

ob_end_clean();
exit;
?>