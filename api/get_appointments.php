<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in', 'appointments' => []]);
    exit;
}

require 'config.php';

$user_id = $_SESSION['user']['id'];
$user_type = $_SESSION['user']['user_type'];
$today_only = isset($_GET['today']) && $_GET['today'] === 'true';

$appointments = [];
$response = ['success' => true, 'appointments' => [], 'count' => 0];

try {
    if ($user_type === 'health_worker') {
        // Get health worker's database ID
        $health_worker_db_id = 0;
        $user_role = 'Health Worker';
        
        // Get health worker info from health_workers table
        if ($stmt = $conn->prepare("SELECT id, specialty FROM health_workers WHERE user_id = ?")) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result && $row = $result->fetch_assoc()) {
                $health_worker_db_id = $row['id']; // This is the health_workers.id
                $specialty = $row['specialty'] ?? '';
                
                // Determine role from specialty
                $lower_specialty = strtolower($specialty);
                if (strpos($lower_specialty, 'doctor') !== false) {
                    $user_role = 'Doctor';
                } elseif (strpos($lower_specialty, 'nurse') !== false) {
                    $user_role = 'Nurse';
                } elseif (strpos($lower_specialty, 'midwife') !== false) {
                    $user_role = 'Midwife';
                }
            }
            $stmt->close();
        }
        
        // If we couldn't find health_workers.id, use user_id as fallback
        if ($health_worker_db_id === 0) {
            $health_worker_db_id = $user_id;
        }
        
        // FIXED QUERY: Match appointments by health_worker_id OR assigned_health_worker_role
        // ADDED: Include 'notes' column in SELECT
        $sql = "SELECT 
                    a.*, 
                    a.notes as notes,  -- Make sure notes column is included
                    COALESCE(u.name, a.for_whom, 'Patient') as patient_name,
                    COALESCE(p.phone, 'Not provided') as patient_phone,
                    COALESCE(p.address, '') as patient_address,
                    COALESCE(p.date_of_birth, '') as patient_dob,
                    COALESCE(p.gender, '') as patient_gender,
                    COALESCE(p.blood_type, '') as patient_blood_type
                FROM appointments a 
                LEFT JOIN users u ON a.patient_user_id = u.id 
                LEFT JOIN patients p ON a.patient_user_id = p.user_id
                WHERE a.status != 'Canceled' 
                AND (
                    a.health_worker_id = ? 
                    OR a.assigned_health_worker_role = ?
                )";
        
        if ($today_only) {
            $sql .= " AND a.appointment_date = CURDATE()";
        }
        
        $sql .= " ORDER BY a.appointment_date, a.appointment_time";
        
        error_log("Health Worker Appointments Query: health_worker_db_id=$health_worker_db_id, user_role=$user_role");
        
        if ($stmt = $conn->prepare($sql)) {
            $stmt->bind_param("is", $health_worker_db_id, $user_role);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $appointments[] = $row;
            }
            $stmt->close();
        }
        
        $response['user_role'] = $user_role;
    }
    elseif ($user_type === 'patient') {
        // ADDED: Include 'notes' column in SELECT for patients
        $sql = "SELECT a.*, a.notes as notes FROM appointments a WHERE a.patient_user_id = ? AND a.status != 'Canceled'";
        
        if ($today_only) {
            $sql .= " AND a.appointment_date = CURDATE()";
        }
        
        $sql .= " ORDER BY a.appointment_date, a.appointment_time";
        
        if ($stmt = $conn->prepare($sql)) {
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $appointments[] = $row;
            }
            $stmt->close();
        }
    }
    
    $response['appointments'] = $appointments;
    $response['count'] = count($appointments);
    
    $conn->close();
    
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log("Appointments error: " . $e->getMessage());
}

ob_end_clean();
echo json_encode($response);
exit;
?>