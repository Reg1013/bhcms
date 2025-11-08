<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['message'=>'Forbidden']);
    exit;
}
$payload = json_decode(file_get_contents('php://input'), true);
$sender = $_SESSION['user']['id'];
$recip  = mysqli_real_escape_string($conn,$payload['recipient_type']);
$msg    = mysqli_real_escape_string($conn,$payload['message']);

$ins = $conn->query("INSERT INTO announcements
    (sender_user_id,recipient_type,message)
    VALUES ($sender,'$recip','$msg')");
echo json_encode(['success'=>$ins]);
?>