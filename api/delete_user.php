<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) ||
    !in_array($_SESSION['user']['user_type'], ['system_admin', 'bhw'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$id = (int)$payload['id'];

// Safety check - cannot delete yourself
if ($id === $_SESSION['user']['id']) {
    echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();
    
    // 1. First, check what type of user this is
    $user_type_stmt = $conn->prepare("SELECT user_type FROM users WHERE id = ?");
    $user_type_stmt->bind_param("i", $id);
    $user_type_stmt->execute();
    $user_type_result = $user_type_stmt->get_result();
    
    if ($user_type_result->num_rows === 0) {
        throw new Exception("User not found");
    }
    
    $user_data = $user_type_result->fetch_assoc();
    $user_type = $user_data['user_type'];
    $user_type_stmt->close();
    
    // 2. Delete from related tables based on user type
    switch($user_type) {
        case 'patient':
            $delete_patient = $conn->prepare("DELETE FROM patients WHERE user_id = ?");
            $delete_patient->bind_param("i", $id);
            $delete_patient->execute();
            $delete_patient->close();
            break;
            
        case 'health_worker':
            $delete_health_worker = $conn->prepare("DELETE FROM health_workers WHERE user_id = ?");
            $delete_health_worker->bind_param("i", $id);
            $delete_health_worker->execute();
            $delete_health_worker->close();
            break;
            
        case 'bhw':
            $delete_bhw = $conn->prepare("DELETE FROM bhw_personnel WHERE user_id = ?");
            $delete_bhw->bind_param("i", $id);
            $delete_bhw->execute();
            $delete_bhw->close();
            break;
    }
    
    // 3. Clean up appointments (set health_worker_id to NULL instead of deleting appointments)
    $clean_appointments = $conn->prepare("UPDATE appointments SET health_worker_id = NULL WHERE health_worker_id = ?");
    $clean_appointments->bind_param("i", $id);
    $clean_appointments->execute();
    $clean_appointments->close();
    
    // 4. Finally delete the user
    $delete_user = $conn->prepare("DELETE FROM users WHERE id = ?");
    $delete_user->bind_param("i", $id);
    $delete_user_success = $delete_user->execute();
    $delete_user->close();
    
        if ($delete_user_success) {
        // Add audit log
        $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip_address, timestamp) VALUES (?, 'User Deleted', ?, ?, NOW())");
        $target = "User ID: $id (Type: $user_type)";
        $actor_id = $_SESSION['user']['id'];
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $log_stmt->bind_param("isi", $actor_id, $target, $ip);
        $log_stmt->execute();
        $log_stmt->close();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    }
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Delete user error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Delete failed: ' . $e->getMessage()]);
}
?>