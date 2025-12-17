<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'health_worker') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$searchTerm = $_GET['q'] ?? '';

if (empty($searchTerm)) {
    echo json_encode(['success' => false, 'message' => 'Search term required']);
    exit;
}

try {
    $searchTerm = '%' . $conn->real_escape_string($searchTerm) . '%';
    
    $stmt = $conn->prepare("
        SELECT u.id, u.name, u.email, u.username 
        FROM users u 
        WHERE u.user_type = 'patient' 
        AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)
        LIMIT 10
    ");
    
    $stmt->bind_param("sss", $searchTerm, $searchTerm, $searchTerm);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $patients = [];
    while ($row = $result->fetch_assoc()) {
        $patients[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'username' => $row['username']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'patients' => $patients
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error searching patients: ' . $e->getMessage()
    ]);
}
?>