<?php
// api/get_audit_logs.php
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'system_admin') {
    http_response_code(403);
    echo json_encode(['message' => 'Forbidden']);
    exit;
}

$sql = "SELECT al.*, u.username 
        FROM audit_logs al 
        JOIN users u ON al.user_id = u.id 
        ORDER BY al.timestamp DESC 
        LIMIT 100";

$result = $conn->query($sql);
$logs = [];

while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}

echo json_encode($logs);
?>