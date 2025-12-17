<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

// Security: Only allow health workers
if (!isset($_SESSION['user']) || 
    ($_SESSION['user']['user_type'] !== 'health_worker' && $_SESSION['user']['db_role'] !== 'health_worker')) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

$user_id = $_SESSION['user']['id'];

// Get patient_user_id from query parameter (this is the users.id of the patient)
$patient_user_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($patient_user_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid patient ID']);
    exit;
}

try {
    // Step 1: Get health worker's own ID and role (same logic as in your other files)
    $health_worker_db_id = 0;
    $user_role = 'Health Worker';

    $stmt = $conn->prepare("SELECT id, specialty FROM health_workers WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $health_worker_db_id = $row['id'];
        $specialty = strtolower($row['specialty'] ?? '');
        if (strpos($specialty, 'doctor') !== false) $user_role = 'Doctor';
        elseif (strpos($specialty, 'nurse') !== false) $user_role = 'Nurse';
        elseif (strpos($specialty, 'midwife') !== false) $user_role = 'Midwife';
    }
    $stmt->close();

    if ($health_worker_db_id === 0) {
        $health_worker_db_id = $user_id; // fallback
    }

    // Step 2: Verify this health worker is allowed to view this patient
    // (They must have at least one non-canceled appointment with them)
    $access_check = $conn->prepare("
        SELECT 1 FROM appointments 
        WHERE patient_user_id = ? 
          AND status != 'Canceled'
          AND (health_worker_id = ? OR assigned_health_worker_role = ?)
        LIMIT 1
    ");
    $access_check->bind_param("iis", $patient_user_id, $health_worker_db_id, $user_role);
    $access_check->execute();
    $access_check->store_result();
    if ($access_check->num_rows === 0) {
        $access_check->close();
        echo json_encode(['success' => false, 'message' => 'Access denied to this patient']);
        exit;
    }
    $access_check->close();

    // Step 3: Get patient personal information
    $patient_stmt = $conn->prepare("
        SELECT 
            u.id,
            u.name,
            p.phone,
            p.address,
            p.date_of_birth,
            p.gender,
            p.blood_type,
            p.status as patient_status
        FROM users u
        LEFT JOIN patients p ON u.id = p.user_id
        WHERE u.id = ? AND u.user_type = 'patient'
    ");
    $patient_stmt->bind_param("i", $patient_user_id);
    $patient_stmt->execute();
    $patient_result = $patient_stmt->get_result();
    $patient = $patient_result->fetch_assoc();
    $patient_stmt->close();

    if (!$patient) {
        echo json_encode(['success' => false, 'message' => 'Patient not found']);
        exit;
    }

    // Calculate age
    $age = 'Not specified';
    if (!empty($patient['date_of_birth'])) {
        try {
            $birthDate = new DateTime($patient['date_of_birth']);
            $today = new DateTime();
            $age = $today->diff($birthDate)->y . ' years';
        } catch (Exception $e) {
            $age = 'Invalid date';
        }
    }

    // Format patient data
    $patient_data = [
        'id' => $patient['id'],
        'name' => $patient['name'] ?: 'Unknown Patient',
        'phone' => $patient['phone'] ?: 'Not provided',
        'address' => $patient['address'] ?: 'Not specified',
        'age' => $age,
        'gender' => $patient['gender'] ?: 'Not specified',
        'blood_type' => $patient['blood_type'] ?: 'Unknown',
        'dob' => $patient['date_of_birth'] ?: 'Not specified',
        'patient_status' => $patient['patient_status'] ?: 'Active'
    ];

    // Step 4: Get all appointments for this patient (with this health worker or role)
    $appt_stmt = $conn->prepare("
        SELECT 
            a.id,
            a.for_whom,
            a.type,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.assigned_health_worker_role,
            a.created_at,
            a.updated_at,
            hw.specialty as health_worker_specialty
        FROM appointments a
        LEFT JOIN health_workers hw ON a.health_worker_id = hw.id
        WHERE a.patient_user_id = ?
          AND a.status != 'Canceled'
          AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    ");
    $appt_stmt->bind_param("iis", $patient_user_id, $health_worker_db_id, $user_role);
    $appt_stmt->execute();
    $appt_result = $appt_stmt->get_result();

    $appointments = [];
    while ($row = $appt_result->fetch_assoc()) {
        $appointments[] = [
            'id' => $row['id'],
            'patient_name' => $row['for_whom'] ?: $patient_data['name'],
            'type' => $row['type'] ?: 'Consultation',
            'appointment_date' => $row['appointment_date'],
            'appointment_time' => $row['appointment_time'],
            'status' => $row['status'],
            'assigned_role' => $row['assigned_health_worker_role'],
            'health_worker_specialty' => $row['health_worker_specialty'] ?: 'Not specified',
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
    $appt_stmt->close();

    // Final response
    echo json_encode([
        'success' => true,
        'patient' => $patient_data,
        'appointments' => $appointments
    ]);

} catch (Exception $e) {
    error_log("get_patient_details.php error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>