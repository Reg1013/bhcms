<?php
// api/get_users.php
require 'config.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'system_admin') {
    http_response_code(403);
    echo json_encode(['message' => 'Forbidden']);
    exit;
}

$sql = "SELECT 
    u.id, 
    u.username, 
    u.role,
    u.created_at,
    COALESCE(sa.name, bhwp.name, hw.name, p.name) as name,
    COALESCE(sa.status, bhwp.status, hw.status, p.status) as status
FROM users u
LEFT JOIN system_admins sa ON u.id = sa.user_id
LEFT JOIN bhw_personnel bhwp ON u.id = bhwp.user_id
LEFT JOIN health_workers hw ON u.id = hw.user_id
LEFT JOIN patients p ON u.id = p.user_id
ORDER BY u.created_at DESC";

$result = $conn->query($sql);
$users = [];

while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
?>