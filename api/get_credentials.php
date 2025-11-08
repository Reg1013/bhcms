<?php
// api/get_credentials.php - FIXED: Show real role (Doctor, Nurse) using your table names
require 'config.php';
header('Content-Type: application/json');

// === 1. AUTH ===
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'barangay_health') {
    http_response_code(403);
    echo json_encode([]);
    exit;
}

$creator_id = $_SESSION['user']['id'];

// === 2. QUERY: Use your actual table names ===
$sql = "
    SELECT 
        u.id,
        u.username,
        COALESCE(b.name, h.name, p.name, u.name, u.username) AS name,
        COALESCE(b.address, h.address, p.address, '') AS address,
        COALESCE(b.status, h.status, p.status, u.status, 'Active') AS status,
        CASE 
            WHEN u.role = 'bhw' THEN 'barangay_health'
            WHEN u.role = 'health_worker' THEN COALESCE(h.specialty, 'health_worker')
            WHEN u.role = 'patient' THEN 'patient'
            ELSE u.role
        END AS role_display
    FROM users u
    LEFT JOIN bhw_personnel b ON u.id = b.user_id
    LEFT JOIN health_workers h ON u.id = h.user_id
    LEFT JOIN patients p ON u.id = p.user_id
    WHERE u.created_by = ?
    ORDER BY u.id DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit;
}

$stmt->bind_param("i", $creator_id);
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while ($row = $result->fetch_assoc()) {
    // Map role_display to clean title
    $role = strtolower($row['role_display']);
    $roleMap = [
        'doctor'  => 'Doctor',
        'midwife' => 'Midwife',
        'nurse'   => 'Nurse',
        'barangay_health' => 'Barangay Health Personnel',
        'patient' => 'Patient',
        'health_worker' => 'Health Worker'
    ];
    $row['role'] = $roleMap[$role] ?? ucfirst($role);

    // Remove helper
    unset($row['role_display']);
    $users[] = $row;
}

$stmt->close();
echo json_encode($users);
?>