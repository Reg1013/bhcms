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
$uid = $_SESSION['user']['id'];

$upd = $conn->query("UPDATE appointments SET status='Canceled'
                     WHERE id=$id AND patient_user_id=$uid");
echo json_encode(['success'=>$upd]);
?>