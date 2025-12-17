<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
session_start();
require 'config.php';

header('Content-Type: text/plain');

echo "=== CURRENT USER ===\n";
echo "User ID: " . $_SESSION['user']['id'] . "\n";
echo "User Type: " . $_SESSION['user']['user_type'] . "\n";

// Get health worker specialty
$health_worker_id = $_SESSION['user']['id'];
$specialty_sql = "SELECT specialty FROM health_workers WHERE user_id = ?";
$specialty_stmt = $conn->prepare($specialty_sql);
$specialty_stmt->bind_param('i', $health_worker_id);
$specialty_stmt->execute();
$specialty_result = $specialty_stmt->get_result();
$specialty_data = $specialty_result->fetch_assoc();
$specialty = $specialty_data['specialty'] ?? 'none';
echo "Health Worker Specialty: " . $specialty . "\n\n";

echo "=== APPOINTMENTS FOR THIS HEALTH WORKER (by health_worker_id) ===\n";
$sql1 = "SELECT COUNT(*) as count FROM appointments WHERE health_worker_id = ?";
$stmt1 = $conn->prepare($sql1);
$stmt1->bind_param('i', $health_worker_id);
$stmt1->execute();
$result1 = $stmt1->get_result();
$count1 = $result1->fetch_assoc();
echo "Appointments with health_worker_id = $health_worker_id: " . $count1['count'] . "\n";

echo "=== APPOINTMENTS FOR THIS SPECIALTY (by assigned_health_worker_role) ===\n";
$sql2 = "SELECT COUNT(*) as count FROM appointments WHERE assigned_health_worker_role = ?";
$stmt2 = $conn->prepare($sql2);
$stmt2->bind_param('s', $specialty);
$stmt2->execute();
$result2 = $stmt2->get_result();
$count2 = $result2->fetch_assoc();
echo "Appointments with assigned_health_worker_role = '$specialty': " . $count2['count'] . "\n";

echo "=== SAMPLE APPOINTMENTS ===\n";
$sql3 = "SELECT id, for_whom, type, status, health_worker_id, assigned_health_worker_role 
         FROM appointments 
         ORDER BY appointment_date DESC 
         LIMIT 10";
$result3 = $conn->query($sql3);
while ($row = $result3->fetch_assoc()) {
    echo "Appointment: " . $row['id'] . " | Patient: " . $row['for_whom'] . " | Type: " . $row['type'] . " | Status: " . $row['status'] . " | HW ID: " . $row['health_worker_id'] . " | Role: " . $row['assigned_health_worker_role'] . "\n";
}

$conn->close();
?>