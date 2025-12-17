<?php
// api/get_bhw_data.php
session_start();
require 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = $_GET['user_id'] ?? $_SESSION['user']['id'];

try {
    // Fetch data from bhw_personnel table
    $stmt = $conn->prepare("
        SELECT * FROM bhw_personnel 
        WHERE user_id = ?
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($bhw_data = $result->fetch_assoc()) {
        echo json_encode([
            'success' => true,
            'bhw_data' => $bhw_data
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'bhw_data' => [] // Return empty if no specific BHW data
        ]);
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching BHW data: ' . $e->getMessage()
    ]);
}
?>