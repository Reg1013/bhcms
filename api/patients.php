<?php
session_start();
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user']) || ($_SESSION['user']['user_type'] !== 'health_worker' && $_SESSION['user']['db_role'] !== 'health_worker')) {
    echo json_encode(['error' => 'Not a health worker']);
    exit;
}

try {
    $user_id = $_SESSION['user']['id'];
    
    // Get health worker's database ID and specialty
    $health_worker_db_id = 0;
    $specialty = '';
    $role = 'Health Worker';
    
    $specialty_sql = "SELECT id, specialty FROM health_workers WHERE user_id = ?";
    $specialty_stmt = $conn->prepare($specialty_sql);
    $specialty_stmt->bind_param('i', $user_id);
    $specialty_stmt->execute();
    $specialty_result = $specialty_stmt->get_result();
    
    if ($specialty_row = $specialty_result->fetch_assoc()) {
        $health_worker_db_id = $specialty_row['id'];
        $specialty = $specialty_row['specialty'] ?? '';
        
        // Determine role from specialty
        $lower_specialty = strtolower($specialty);
        if (strpos($lower_specialty, 'doctor') !== false) {
            $role = 'Doctor';
        } elseif (strpos($lower_specialty, 'nurse') !== false) {
            $role = 'Nurse';
        } elseif (strpos($lower_specialty, 'midwife') !== false) {
            $role = 'Midwife';
        }
    }
    $specialty_stmt->close();
    
    // If no health_workers record found, use user_id as fallback
    if ($health_worker_db_id === 0) {
        $health_worker_db_id = $user_id;
    }
    
    // Get patients who have appointments with this health worker
    $sql = "SELECT DISTINCT
                u.id,
                u.name as patient_name,
                u.email,
                p.date_of_birth,
                p.gender,
                p.phone,
                p.address,
                p.blood_type,
                p.status as patient_status,
                MAX(CASE WHEN a.status = 'Completed' THEN a.appointment_date ELSE NULL END) as last_visit
            FROM users u
            LEFT JOIN patients p ON u.id = p.user_id
            LEFT JOIN appointments a ON u.id = a.patient_user_id 
            WHERE u.user_type = 'patient'
                AND a.status != 'Canceled'
                AND (
                    a.health_worker_id = ? 
                    OR a.assigned_health_worker_role = ?
                )
            GROUP BY u.id
            ORDER BY last_visit DESC
            LIMIT 100";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('is', $health_worker_db_id, $role);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $patients = [];
    while ($row = $result->fetch_assoc()) {
        // Calculate age from date_of_birth
        $age = 'Not specified';
        if (!empty($row['date_of_birth'])) {
            try {
                $birthDate = new DateTime($row['date_of_birth']);
                $today = new DateTime();
                $age = $today->diff($birthDate)->y . ' years';
            } catch (Exception $e) {
                $age = 'Not specified';
            }
        }
        
        // Get patient ID
        $patient_id = $row['id'];
        
        // Get appointment details for this patient with this health worker
        $appointment_sql = "SELECT 
                                type, 
                                status, 
                                appointment_date, 
                                appointment_time 
                            FROM appointments 
                            WHERE patient_user_id = ? 
                                AND status != 'Canceled'
                                AND (
                                    health_worker_id = ? 
                                    OR assigned_health_worker_role = ?
                                )
                            ORDER BY appointment_date DESC
                            LIMIT 5";
        
        $appointment_stmt = $conn->prepare($appointment_sql);
        $appointment_stmt->bind_param('iis', $patient_id, $health_worker_db_id, $role);
        $appointment_stmt->execute();
        $appointment_result = $appointment_stmt->get_result();
        
        $appointments = [];
        $conditions = [];
        $upcoming_appointments = 0;
        $completed_appointments = 0;
        
        while ($appt_row = $appointment_result->fetch_assoc()) {
            $type = $appt_row['type'] ?? 'Consultation';
            $status = $appt_row['status'] ?? 'Scheduled';
            
            if ($type) {
                $conditions[] = $type;
            }
            
            $appointments[] = [
                'type' => $type,
                'status' => $status,
                'appointment_date' => $appt_row['appointment_date'] ?? '',
                'appointment_time' => $appt_row['appointment_time'] ?? ''
            ];
            
            if ($status === 'Scheduled' || $status === 'In Progress') {
                $upcoming_appointments++;
            } elseif ($status === 'Completed') {
                $completed_appointments++;
            }
        }
        $appointment_stmt->close();
        
        // Get unique conditions
        $unique_conditions = array_unique(array_filter($conditions));
        $condition_text = !empty($unique_conditions) ? implode(', ', $unique_conditions) : 'General checkup';
        
        // Limit condition text length
        if (strlen($condition_text) > 100) {
            $condition_text = substr($condition_text, 0, 97) . '...';
        }
        
        $patients[] = [
            'id' => $row['id'],
            'name' => $row['patient_name'] ?: 'Unknown Patient',
            'email' => $row['email'] ?: '',
            'phone' => $row['phone'] ?: '',
            'address' => $row['address'] ?: '',
            'age' => $age,
            'gender' => $row['gender'] ?: 'Not specified',
            'blood_type' => $row['blood_type'] ?: 'Unknown',
            'patient_status' => $row['patient_status'] ?: 'Active',
            'condition' => $condition_text,
            'last_visit' => $row['last_visit'] ?: 'No visits yet',
            'admissionDate' => $row['last_visit'] ?: 'No visits yet',
            'appointmentStatus' => count($appointments) > 0 ? 'Active' : 'No appointments',
            'total_appointments' => count($appointments),
            'upcoming_appointments' => $upcoming_appointments,
            'completed_appointments' => $completed_appointments,
            'all_appointments' => $appointments
        ];
    }
    
    $stmt->close();
    
    echo json_encode($patients);
    
} catch (Exception $e) {
    error_log("Patients API error: " . $e->getMessage());
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

$conn->close();
?>