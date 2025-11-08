<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) ||
    !in_array($_SESSION['user']['user_type'],['system_admin','barangay_health'])) {
    http_response_code(403);
    echo json_encode(['message'=>'Forbidden']);
    exit;
}
$payload = json_decode(file_get_contents('php://input'), true);
$id = (int)$payload['id'];

$del = $conn->query("DELETE FROM users WHERE id=$id");
echo json_encode(['success'=>$del]);
?>