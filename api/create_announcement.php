<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden: No user session']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);

if (!$payload || !isset($payload['recipient_type']) || !isset($payload['message'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input: Missing required fields']);
    exit;
}

$sender = $_SESSION['user']['id'];
$recipient_type = $conn->real_escape_string($payload['recipient_type']);
$message = $conn->real_escape_string($payload['message']);
$specific_patient_id = isset($payload['patient_id']) ? (int)$payload['patient_id'] : null;

// Validate recipient type - only allow the simplified options
$allowed_recipients = ['all_patients', 'specific_patient', 'emergency_cases'];
if (!in_array($recipient_type, $allowed_recipients)) {
    echo json_encode(['success' => false, 'message' => 'Invalid recipient type']);
    exit;
}

// Validate specific patient
if ($recipient_type === 'specific_patient' && !$specific_patient_id) {
    echo json_encode(['success' => false, 'message' => 'Specific patient required']);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // Insert announcement
    $stmt = $conn->prepare("INSERT INTO announcements (sender_user_id, recipient_type, message) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $sender, $recipient_type, $message);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to create announcement: " . $stmt->error);
    }
    
    $announcement_id = $conn->insert_id;
    $stmt->close();

    // Create notifications based on recipient type
    if ($recipient_type === 'all_patients') {
        // Notify all patients
        $patients_stmt = $conn->prepare("SELECT id FROM users WHERE user_type = 'patient'");
        $patients_stmt->execute();
        $patients_result = $patients_stmt->get_result();
        
        $notification_stmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, 'New Announcement', ?, 'announcement', ?)");
        
        while ($patient = $patients_result->fetch_assoc()) {
            $notification_stmt->bind_param("isi", $patient['id'], $message, $announcement_id);
            $notification_stmt->execute();
        }
        
        $patients_stmt->close();
        $notification_stmt->close();
    }
    elseif ($recipient_type === 'specific_patient') {
        // Notify only the specific patient
        $notification_stmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, 'New Announcement', ?, 'announcement', ?)");
        $notification_stmt->bind_param("isi", $specific_patient_id, $message, $announcement_id);
        $notification_stmt->execute();
        $notification_stmt->close();
    }
    elseif ($recipient_type === 'emergency_cases') {
        // You can define what emergency cases mean - for now, notify all patients
        $patients_stmt = $conn->prepare("SELECT id FROM users WHERE user_type = 'patient'");
        $patients_stmt->execute();
        $patients_result = $patients_stmt->get_result();
        
        $notification_stmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, 'Emergency Announcement', ?, 'announcement', ?)");
        
        while ($patient = $patients_result->fetch_assoc()) {
            $notification_stmt->bind_param("isi", $patient['id'], $message, $announcement_id);
            $notification_stmt->execute();
        }
        
        $patients_stmt->close();
        $notification_stmt->close();
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode(['success' => true, 'message' => 'Announcement sent successfully']);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>