<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type']!=='patient') {
    http_response_code(403);
    echo json_encode([]);
    exit;
}
$pid = $_SESSION['user']['id'];
$res = $conn->query("SELECT * FROM children WHERE patient_id=$pid");
$out = [];
while ($r=$res->fetch_assoc()) $out[]=$r;
echo json_encode($out);
?>