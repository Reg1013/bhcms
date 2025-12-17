<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || empty($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

// For health workers, fetch additional data from health_workers table
if ($_SESSION['user']['user_type'] === 'health_worker') {
    $user_id = $_SESSION['user']['id'];
    
    try {
        $stmt = $conn->prepare("
            SELECT name, specialty, license_number, phone, shift 
            FROM health_workers 
            WHERE user_id = ?
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($hw_data = $result->fetch_assoc()) {
            // Merge health worker data with session data
            $_SESSION['user'] = array_merge($_SESSION['user'], $hw_data);
        }
        $stmt->close();
        
    } catch (Exception $e) {
        // Log error but don't break
        error_log("Health worker data fetch error: " . $e->getMessage());
    }
}

// For Barangay Health Personnel, fetch from bhw_personnel table
if ($_SESSION['user']['user_type'] === 'bhw') {
    $user_id = $_SESSION['user']['id'];
    
    try {
        $stmt = $conn->prepare("
            SELECT * FROM bhw_personnel 
            WHERE user_id = ?
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($bhw_data = $result->fetch_assoc()) {
            // Merge BHW data with session data
            $_SESSION['user'] = array_merge($_SESSION['user'], $bhw_data);
        }
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("BHW data fetch error: " . $e->getMessage());
    }
}

// Return consistent user data
echo json_encode([
    'success' => true, 
    'user' => $_SESSION['user']
]);
?>