<?php
// api/current_user.php - Fixed to include 'success' key
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user']) && !empty($_SESSION['user']['id'])) {
    echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
}
?>