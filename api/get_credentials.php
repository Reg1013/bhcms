<?php
// api/get_credentials.php - COMPREHENSIVE DEBUG
session_start();
require 'config.php';
header('Content-Type: application/json');

// Debug session
error_log("=== GET_CREDENTIALS DEBUG ===");
error_log("Session data: " . print_r($_SESSION, true));

// === 1. AUTH ===
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'bhw') {
    $user_type = $_SESSION['user']['user_type'] ?? 'none';
    error_log("❌ Auth failed - User type: $user_type, Expected: bhw");
    http_response_code(403);
    echo json_encode(['error' => 'Access denied', 'user_type' => $user_type]);
    exit;
}

$creator_id = $_SESSION['user']['id'];
$creator_name = $_SESSION['user']['name'];
error_log("✅ Auth passed - Creator: $creator_name (ID: $creator_id)");

// === 2. QUERY: Check if we can find any users created by this BHW ===
$sql = "SELECT COUNT(*) as user_count FROM users WHERE created_by = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $creator_id);
$stmt->execute();
$result = $stmt->get_result();
$count_data = $result->fetch_assoc();
$user_count = $count_data['user_count'];
$stmt->close();

error_log("📊 Users found with created_by = $creator_id: $user_count");

if ($user_count === 0) {
    error_log("🔍 No users found. Checking if creator_id is being set properly...");
    
    // Check recent users to see created_by values
    $check_sql = "SELECT id, username, name, user_type, created_by FROM users ORDER BY id DESC LIMIT 10";
    $check_result = $conn->query($check_sql);
    error_log("Recent users and their created_by values:");
    while ($row = $check_result->fetch_assoc()) {
        error_log(" - User: {$row['username']} ({$row['name']}) - created_by: {$row['created_by']}");
    }
    
    echo json_encode([]);
    exit;
}

// === 3. MAIN QUERY: Get the actual user data ===
$sql = "
    SELECT 
        u.id,
        u.username,
        u.name,
        u.user_type,
        u.status,
        u.created_at,
        COALESCE(b.address, h.address, p.address, 'No address') AS address
    FROM users u
    LEFT JOIN bhw_personnel b ON u.id = b.user_id
    LEFT JOIN health_workers h ON u.id = h.user_id
    LEFT JOIN patients p ON u.id = p.user_id
    WHERE u.created_by = ?
    ORDER BY u.created_at DESC
";

error_log("🔍 Executing query: $sql with creator_id: $creator_id");

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("❌ Prepare failed: " . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Database prepare error']);
    exit;
}

$stmt->bind_param("i", $creator_id);
if (!$stmt->execute()) {
    error_log("❌ Execute failed: " . $stmt->error);
    http_response_code(500);
    echo json_encode(['error' => 'Database execute error']);
    exit;
}

$result = $stmt->get_result();
$users = [];
$count = 0;

while ($row = $result->fetch_assoc()) {
    $count++;
    error_log("📝 Processing user {$count}: {$row['username']} ({$row['name']})");
    
    // Map user_type to clean role name
    $roleMap = [
        'doctor' => 'Doctor',
        'midwife' => 'Midwife', 
        'nurse' => 'Nurse',
        'patient' => 'Patient',
        'health_worker' => 'Health Worker',
        'bhw' => 'Barangay Health Personnel'
    ];
    
    $row['role'] = $roleMap[$row['user_type']] ?? ucfirst($row['user_type']);
    
    $users[] = $row;
}

error_log("✅ Query successful. Returning $count users");
$stmt->close();

echo json_encode($users);
?>