<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if ($_SESSION['user']['user_type'] !== 'system_admin') die(json_encode(["success"=>false]));

$input = json_decode(file_get_contents('php://input'), true);
$mode = $input['maintenance'] ?? 0;

$stmt = $conn->prepare("INSERT INTO settings (`key`,`value`) VALUES('maintenance_mode',?) ON DUPLICATE KEY UPDATE `value`=?");
$stmt->bind_param("s",$mode);
$stmt->execute();

$log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, target, ip_address) VALUES (?, 'Maintenance Mode Updated', ?, ?)");
$target = "Maintenance mode: " . ($mode ? "ON" : "OFF");
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$log_stmt->bind_param("iss", $_SESSION['user']['id'], $target, $ip);
$log_stmt->execute();
$log_stmt->close();

echo json_encode(["success" => true]);
?>