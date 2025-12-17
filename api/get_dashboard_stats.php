<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

// Check if user is system admin
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'system_admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

// Get total users count
$sql = "SELECT COUNT(*) as total_users FROM users";
$result = $conn->query($sql);
$total_users = $result ? $result->fetch_assoc()['total_users'] : 0;

// Get active users (status = Active)
$sql_active = "SELECT COUNT(*) as active_users FROM users WHERE status = 'Active'";
$result_active = $conn->query($sql_active);
$active_users = $result_active ? $result_active->fetch_assoc()['active_users'] : 0;

// Get today's registrations
$sql_today = "SELECT COUNT(*) as today_reg FROM users WHERE DATE(created_at) = CURDATE()";
$result_today = $conn->query($sql_today);
$today_reg = $result_today ? $result_today->fetch_assoc()['today_reg'] : 0;

echo json_encode([
    'success' => true,
    'data' => [
        'total_users' => $total_users,
        'active_sessions' => $active_users, // Using active users as "sessions"
        'today_registrations' => $today_reg,
        'system_health' => [
            'database' => $conn->ping() ? 'Online' : 'Offline',
            'last_backup' => '2 hours ago' // Static for now
        ]
    ]
]);
?>