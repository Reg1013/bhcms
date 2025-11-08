<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type']!=='patient') {
    http_response_code(403);
    echo json_encode(['message'=>'Forbidden']);
    exit;
}
$payload = json_decode(file_get_contents('php://input'), true);
$id = (int)$payload['id'];
$pid = $_SESSION['user']['id'];

$del = $conn->query("DELETE FROM children WHERE id=$id AND patient_id=$pid");
echo json_encode(['success'=>$del]);
?>