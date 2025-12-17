<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'patient') {
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

require 'config.php';

$payload = json_decode(file_get_contents('php://input'), true);
$uid = $_SESSION['user']['id'];

// Get values
$for_whom = $payload['for_whom'] ?? '';
$type = $payload['type'] ?? '';
$date = $payload['date'] ?? '';
$time_input = $payload['time'] ?? '';

// Validate
if (empty($for_whom) || empty($type) || empty($date) || empty($time_input)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

// DEBUG LOGGING
error_log("=== CREATE APPOINTMENT DEBUG ===");
error_log("Received: for_whom='$for_whom', type='$type', date='$date', time='$time_input'");

// SIMPLE TIME PARSING - FIXED VERSION
$time_to_store = '09:00:00'; // Default fallback

if (!empty($time_input)) {
    $time_input = trim($time_input);
    
    // Handle HH:MM:SS format
    if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $time_input, $matches)) {
        // Format: HH:MM:SS
        $hour = intval($matches[1]);
        $minute = intval($matches[2]);
        $second = intval($matches[3]);
        
        if ($hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59 && $second >= 0 && $second <= 59) {
            $time_to_store = sprintf('%02d:%02d:%02d', $hour, $minute, $second);
        }
    } 
    elseif (preg_match('/^(\d{1,2}):(\d{2})$/', $time_input, $matches)) {
        // Format: HH:MM
        $hour = intval($matches[1]);
        $minute = intval($matches[2]);
        
        if ($hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59) {
            $time_to_store = sprintf('%02d:%02d:00', $hour, $minute);
        }
    }
    
    error_log("Parsed time input '$time_input' -> storing '$time_to_store'");
}

// Log the final time
error_log("Final time to store: '$time_to_store'");

// Service mapping
$service_mapping = [
    // Doctor Services
    'Medical Consultation' => 'Doctor',
    'Emergency Care' => 'Doctor',
    'Chronic Disease Management' => 'Doctor',
    'Health Screening' => 'Doctor',
    
    // Nurse Services
    'Vital Sign Monitoring' => 'Nurse',
    'Diagnostic Test' => 'Nurse',
    'Wound Care & Dressing' => 'Nurse',
    'Patient Education' => 'Nurse',
    
    // Midwife Services
    'Prenatal Check-up' => 'Midwife',
    'Family Planning Counseling' => 'Midwife',
    'Postnatal Care' => 'Midwife',
    'Immunization' => 'Midwife'
];

// Determine the role based on service type
$assigned_health_worker_role = $service_mapping[$type] ?? 'General';

$health_worker_db_id = 0;

// Find health worker with matching specialty
if ($assigned_health_worker_role !== 'General') {
    // Map role to specialty keywords
    $specialty_keywords = [
        'Doctor' => ['doctor', 'physician', 'medical'],
        'Nurse' => ['nurse', 'nursing'],
        'Midwife' => ['midwife', 'midwifery']
    ];
    
    $keywords = $specialty_keywords[$assigned_health_worker_role] ?? [];
    
    if (!empty($keywords)) {
        $keyword_conditions = [];
        $params = [];
        
        foreach ($keywords as $keyword) {
            $keyword_conditions[] = "hw.specialty LIKE ?";
            $params[] = "%" . $keyword . "%";
        }
        
        $where_clause = implode(" OR ", $keyword_conditions);
        
        $find_sql = "SELECT hw.id as hw_id 
                    FROM health_workers hw 
                    INNER JOIN users u ON hw.user_id = u.id
                    WHERE u.user_type = 'health_worker' 
                    AND u.status = 'Active' 
                    AND ($where_clause)
                    LIMIT 1";
        
        $find_stmt = $conn->prepare($find_sql);
        if ($find_stmt) {
            $types = str_repeat('s', count($params));
            $find_stmt->bind_param($types, ...$params);
            $find_stmt->execute();
            $result = $find_stmt->get_result();
            if ($result && $row = $result->fetch_assoc()) {
                $health_worker_db_id = (int)$row['hw_id'];
            }
            $find_stmt->close();
        }
    }
}

// DEBUG: Log everything before insert
error_log("=== INSERT DATA ===");
error_log("patient_user_id: $uid");
error_log("for_whom: $for_whom");
error_log("type: $type");
error_log("date: $date");
error_log("time: $time_to_store");
error_log("health_worker_id: $health_worker_db_id");
error_log("assigned_health_worker_role: $assigned_health_worker_role");

// FIXED INSERT STATEMENT - Use prepared statement correctly
$sql = "INSERT INTO appointments (
            patient_user_id, 
            for_whom, 
            type, 
            appointment_date, 
            appointment_time, 
            health_worker_id, 
            assigned_health_worker_role, 
            status,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', NOW())";
    
$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

// Debug bind_param
error_log("Binding params: $uid, '$for_whom', '$type', '$date', '$time_to_store', $health_worker_db_id, '$assigned_health_worker_role'");

// Bind parameters - make sure types match
$stmt->bind_param("issssis", 
    $uid,                     // i - integer
    $for_whom,                // s - string
    $type,                    // s - string
    $date,                    // s - string (date)
    $time_to_store,           // s - string (time)
    $health_worker_db_id,     // i - integer
    $assigned_health_worker_role // s - string
);

if ($stmt->execute()) {
    $appointment_id = $conn->insert_id;
    
    // Verify the inserted data
    $verify_sql = "SELECT appointment_time FROM appointments WHERE id = ?";
    $verify_stmt = $conn->prepare($verify_sql);
    $verify_stmt->bind_param("i", $appointment_id);
    $verify_stmt->execute();
    $verify_result = $verify_stmt->get_result();
    $verify_row = $verify_result->fetch_assoc();
    $verify_stmt->close();
    
    error_log("Inserted appointment ID: $appointment_id");
    error_log("Verified stored time: " . ($verify_row['appointment_time'] ?? 'NOT FOUND'));
    
    echo json_encode([
        'success' => true,
        'appointment_id' => $appointment_id,
        'assigned_to' => $health_worker_db_id,
        'assigned_role' => $assigned_health_worker_role,
        'expected_time' => $time_to_store,
        'stored_time' => $verify_row['appointment_time'] ?? 'unknown',
        'message' => 'Appointment created successfully'
    ]);
} else {
    error_log("Execute failed: " . $stmt->error);
    echo json_encode(['success' => false, 'message' => 'Failed to create appointment: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
exit;
?>