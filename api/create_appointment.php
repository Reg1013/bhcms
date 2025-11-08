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
$uid = $_SESSION['user']['id'];

$for   = mysqli_real_escape_string($conn,$payload['for_whom']);
$type  = mysqli_real_escape_string($conn,$payload['type']);
$date  = $payload['date'];
$time  = $payload['time'];

$ins = $conn->query("INSERT INTO appointments
    (patient_user_id,for_whom,type,appointment_date,appointment_time)
    VALUES ($uid,'$for','$type','$date','$time')");

echo json_encode(['success'=>$ins]);
?>