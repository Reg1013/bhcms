<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([]);
    exit;
}
$uid = $_SESSION['user']['id'];
$role = $_SESSION['user']['user_type'];

if ($role==='patient') {
    $sql = "SELECT * FROM appointments WHERE patient_user_id=$uid ORDER BY appointment_date,appointment_time";
} else {   // health worker – show today's appointments
    $sql = "SELECT a.*, p.name AS patient_name
            FROM appointments a
            JOIN patients p ON a.patient_user_id=p.user_id
            WHERE a.health_worker_id IS NULL
            AND a.appointment_date = CURDATE()
            ORDER BY a.appointment_time";
}
$res = $conn->query($sql);
$out = [];
while ($r=$res->fetch_assoc()) $out[]=$r;
echo json_encode($out);
?>