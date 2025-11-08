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
$pid = $_SESSION['user']['id'];

$name   = mysqli_real_escape_string($conn,$payload['name']);
$dob    = $payload['dob'];
$gender = mysqli_real_escape_string($conn,$payload['gender']);

$ins = $conn->query("INSERT INTO children
    (patient_id,name,dob,gender)
    VALUES ($pid,'$name','$dob','$gender')");
echo json_encode(['success'=>$ins]);
?>