<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([]);
    exit;
}
$u = $_SESSION['user'];
$out = [];

if ($u['user_type']==='system_admin') {
    $out['totalUsers'] = $conn->query("SELECT COUNT(*) c FROM users")->fetch_assoc()['c'];
    $out['activeSessions'] = 0;               // not tracked
} elseif ($u['user_type']==='barangay_health') {
    $out['credentialsCount'] = $conn->query("SELECT COUNT(*) c FROM users WHERE created_by={$u['id']}")->fetch_assoc()['c'];
} elseif ($u['user_type']==='health_worker') {
    $out['todayAppointments'] = 8;
    $out['pendingConsultations'] = 5;
    $out['emergencyCases'] = 2;
    $out['totalPatients'] = 156;
} elseif ($u['user_type']==='patient') {
    $out['upcomingCount'] = $conn->query("SELECT COUNT(*) c FROM appointments WHERE patient_user_id={$u['id']} AND status='Scheduled'")->fetch_assoc()['c'];
    $out['childrenCount']  = $conn->query("SELECT COUNT(*) c FROM children WHERE patient_id={$u['id']}")->fetch_assoc()['c'];
}
echo json_encode($out);
?>