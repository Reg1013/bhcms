<?php
// debug_login.php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');

// Log the request
error_log("=== DEBUG LOGIN REQUEST ===");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Not set'));

// Get raw input
$input = file_get_contents('php://input');
error_log("Raw input: " . $input);

$data = json_decode($input, true);
error_log("JSON decoded: " . print_r($data, true));

// Simulate a successful response for testing
echo json_encode([
    "success" => true,
    "message" => "Debug endpoint working",
    "received_data" => $data,
    "session_id" => session_id()
]);
?>