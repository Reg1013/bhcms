<?php
// Update existing update_appointment_status.php to handle notes
session_start();
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$appointment_id = $input['appointment_id'] ?? null;
$status = $input['status'] ?? null;
$notes = $input['notes'] ?? ''; // NEW: Optional notes

if (!$appointment_id || !$status) {
    echo json_encode(['success' => false, 'message' => 'Appointment ID and status required']);
    exit;
}

$user_id = $_SESSION['user']['id'];
$user_type = $_SESSION['user']['user_type'];

try {
    $conn->begin_transaction();
    
    if ($user_type === 'health_worker') {
        // Check if appointment belongs to this health worker
        $stmt = $conn->prepare("
            SELECT a.*, hw.id as health_worker_db_id 
            FROM appointments a
            LEFT JOIN health_workers hw ON hw.user_id = ?
            WHERE a.id = ?
        ");
        $stmt->bind_param("ii", $user_id, $appointment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $appointment = $result->fetch_assoc();
        $stmt->close();
        
        if (!$appointment) {
            echo json_encode(['success' => false, 'message' => 'Appointment not found']);
            exit;
        }
        
        // Check authorization
        $authorized = false;
        $health_worker_db_id = $appointment['health_worker_db_id'] ?? 0;
        
        if ($health_worker_db_id && $appointment['health_worker_id'] == $health_worker_db_id) {
            $authorized = true;
        } elseif ($appointment['assigned_health_worker_role']) {
            // Get user role
            $stmt = $conn->prepare("SELECT specialty FROM health_workers WHERE user_id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $specialty = strtolower($row['specialty'] ?? '');
                $user_role = 'Health Worker';
                if (strpos($specialty, 'doctor') !== false) $user_role = 'Doctor';
                elseif (strpos($specialty, 'nurse') !== false) $user_role = 'Nurse';
                elseif (strpos($specialty, 'midwife') !== false) $user_role = 'Midwife';
                
                if ($appointment['assigned_health_worker_role'] === $user_role) {
                    $authorized = true;
                }
            }
            $stmt->close();
        }
        
        if (!$authorized) {
            echo json_encode(['success' => false, 'message' => 'Not authorized to update this appointment']);
            exit;
        }
        
        // Update appointment status and notes
        $updateStmt = $conn->prepare("
            UPDATE appointments 
            SET status = ?, 
                notes = CONCAT(COALESCE(notes, ''), ?, '\n'),
                updated_at = NOW() 
            WHERE id = ?
        ");
        
        $notesPrefix = $notes ? "\n[Added on " . date('Y-m-d H:i') . "]: " . $notes : '';
        $updateStmt->bind_param("ssi", $status, $notesPrefix, $appointment_id);
        $updateStmt->execute();
        $updateStmt->close();
        
    } elseif ($user_type === 'patient') {
        // Patient can only cancel their own appointments
        if ($status !== 'Canceled') {
            echo json_encode(['success' => false, 'message' => 'Patients can only cancel appointments']);
            exit;
        }
        
        $stmt = $conn->prepare("
            UPDATE appointments 
            SET status = ?, updated_at = NOW() 
            WHERE id = ? AND patient_user_id = ?
        ");
        $stmt->bind_param("sii", $status, $appointment_id, $user_id);
        $stmt->execute();
        $stmt->close();
    }
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Appointment status updated successfully'
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Update appointment status error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>