<?php
// health_worker_stats.php - UPDATED VERSION (Counts ALL appointments, not just today)

error_reporting(0);
ini_set('display_errors', 0);
ob_start();

session_start();

if (!isset($_SESSION['user'])) {
    sendJsonError('Not logged in');
}

if ($_SESSION['user']['user_type'] !== 'health_worker') {
    sendJsonError('Forbidden - Not a health worker');
}

require 'config.php';

$user_id = $_SESSION['user']['id'];
$today = date('Y-m-d');

$response = [
    'success' => true,
    'todayPatients' => 0,
    'healthWorkerId' => 0,
    'userRole' => 'Health Worker',
    'specialty' => '',
    'consultations' => 0,
    'emergencyCases' => 0,
    'procedures' => 0,
    'vitalsRecorded' => 0,
    'prenatalChecks' => 0,
    'postnatalCare' => 0,
    'familyPlanning' => 0,
    'pendingTasks' => 0,
    'totalAppointments' => 0  // Added for reference
];

try {
    // Get health worker info
    $sql = "SELECT hw.id, hw.specialty FROM health_workers hw WHERE hw.user_id = ?";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $row = $result->fetch_assoc()) {
            $response['healthWorkerId'] = (int)$row['id'];
            $response['specialty'] = $row['specialty'] ?? '';
            
            // Determine role from specialty
            $specialty_lower = strtolower($response['specialty']);
            if (strpos($specialty_lower, 'doctor') !== false) {
                $response['userRole'] = 'Doctor';
            } elseif (strpos($specialty_lower, 'nurse') !== false) {
                $response['userRole'] = 'Nurse';
            } elseif (strpos($specialty_lower, 'midwife') !== false) {
                $response['userRole'] = 'Midwife';
            }
        }
        $stmt->close();
    }
    
    // If no health_workers record found, use user_id as fallback
    if ($response['healthWorkerId'] === 0) {
        $response['healthWorkerId'] = $user_id;
    }
    
    // Count today's patients (distinct patients) - KEEP this for "Today's Patients" stat
    $sql_count = "SELECT COUNT(DISTINCT a.patient_user_id) as count 
                 FROM appointments a 
                 WHERE a.appointment_date = ? 
                 AND a.status != 'Canceled'
                 AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
    
    $stmt_count = $conn->prepare($sql_count);
    if ($stmt_count) {
        $stmt_count->bind_param("sis", $today, $response['healthWorkerId'], $response['userRole']);
        $stmt_count->execute();
        $result_count = $stmt_count->get_result();
        if ($result_count && $row = $result_count->fetch_assoc()) {
            $response['todayPatients'] = (int)$row['count'];
        }
        $stmt_count->close();
    }
    
    // Get pending tasks (Scheduled or In Progress appointments) - ALL dates
    $sql_pending = "SELECT COUNT(*) as count 
                   FROM appointments a 
                   WHERE (a.appointment_date >= ? OR a.status = 'In Progress')
                   AND a.status IN ('Scheduled', 'In Progress')
                   AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
    
    $stmt_pending = $conn->prepare($sql_pending);
    if ($stmt_pending) {
        $stmt_pending->bind_param("sis", $today, $response['healthWorkerId'], $response['userRole']);
        $stmt_pending->execute();
        $result_pending = $stmt_pending->get_result();
        if ($result_pending && $row = $result_pending->fetch_assoc()) {
            $response['pendingTasks'] = (int)$row['count'];
        }
        $stmt_pending->close();
    }
    
    // Get total consultations for today - KEEP for Doctor's "Consultations" stat
    $sql_consults = "SELECT COUNT(*) as count 
                    FROM appointments a 
                    WHERE a.appointment_date = ? 
                    AND a.status != 'Canceled'
                    AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
    
    $stmt_consults = $conn->prepare($sql_consults);
    if ($stmt_consults) {
        $stmt_consults->bind_param("sis", $today, $response['healthWorkerId'], $response['userRole']);
        $stmt_consults->execute();
        $result_consults = $stmt_consults->get_result();
        if ($result_consults && $row = $result_consults->fetch_assoc()) {
            $response['consultations'] = (int)$row['count'];
        }
        $stmt_consults->close();
    }
    
    // ===== IMPORTANT CHANGE: Count ALL appointments for role-specific stats =====
    
    if ($response['userRole'] === 'Doctor') {
        // For Doctor: Count ALL emergency cases (not just today)
        $sql_doc = "SELECT COUNT(*) as count 
                   FROM appointments a 
                   WHERE a.status != 'Canceled'
                   AND (a.type LIKE '%Emergency%' OR a.type LIKE '%Urgent%')
                   AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
        
        $stmt_doc = $conn->prepare($sql_doc);
        if ($stmt_doc) {
            $stmt_doc->bind_param("is", $response['healthWorkerId'], $response['userRole']);
            $stmt_doc->execute();
            $result_doc = $stmt_doc->get_result();
            if ($result_doc && $row = $result_doc->fetch_assoc()) {
                $response['emergencyCases'] = (int)$row['count'];
            }
            $stmt_doc->close();
        }
    }
    elseif ($response['userRole'] === 'Nurse') {
        // For Nurse: Count ALL procedures (not just today)
        $sql_nurse_proc = "SELECT COUNT(*) as count 
                          FROM appointments a 
                          WHERE a.status != 'Canceled'
                          AND (a.type LIKE '%Diagnostic%' OR a.type LIKE '%Test%' OR a.type LIKE '%Wound%' OR a.type LIKE '%Procedure%')
                          AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
        
        $stmt_nurse_proc = $conn->prepare($sql_nurse_proc);
        if ($stmt_nurse_proc) {
            $stmt_nurse_proc->bind_param("is", $response['healthWorkerId'], $response['userRole']);
            $stmt_nurse_proc->execute();
            $result_nurse_proc = $stmt_nurse_proc->get_result();
            if ($result_nurse_proc && $row = $result_nurse_proc->fetch_assoc()) {
                $response['procedures'] = (int)$row['count'];
            }
            $stmt_nurse_proc->close();
        }
        
        // Vitals recorded - count all appointments (not just today)
        $sql_nurse_vitals = "SELECT COUNT(*) as count 
                           FROM appointments a 
                           WHERE a.status != 'Canceled'
                           AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
        
        $stmt_nurse_vitals = $conn->prepare($sql_nurse_vitals);
        if ($stmt_nurse_vitals) {
            $stmt_nurse_vitals->bind_param("is", $response['healthWorkerId'], $response['userRole']);
            $stmt_nurse_vitals->execute();
            $result_nurse_vitals = $stmt_nurse_vitals->get_result();
            if ($result_nurse_vitals && $row = $result_nurse_vitals->fetch_assoc()) {
                $response['vitalsRecorded'] = (int)$row['count'];
            }
            $stmt_nurse_vitals->close();
        }
    }
    elseif ($response['userRole'] === 'Midwife') {
        // For Midwife: Count ALL prenatal, postnatal, family planning (not just today)
        $sql_midwife = "SELECT 
            COUNT(CASE WHEN a.type LIKE '%Prenatal%' OR a.type LIKE '%Antenatal%' THEN 1 END) as prenatal,
            COUNT(CASE WHEN a.type LIKE '%Postnatal%' THEN 1 END) as postnatal,
            COUNT(CASE WHEN (a.type LIKE '%Family%' OR a.type LIKE '%Planning%' OR a.type LIKE '%Contraceptive%') THEN 1 END) as family
        FROM appointments a 
        WHERE a.status != 'Canceled'
        AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
        
        $stmt_midwife = $conn->prepare($sql_midwife);
        if ($stmt_midwife) {
            $stmt_midwife->bind_param("is", $response['healthWorkerId'], $response['userRole']);
            $stmt_midwife->execute();
            $result_midwife = $stmt_midwife->get_result();
            if ($result_midwife && $row = $result_midwife->fetch_assoc()) {
                $response['prenatalChecks'] = (int)$row['prenatal'];
                $response['postnatalCare'] = (int)$row['postnatal'];
                $response['familyPlanning'] = (int)$row['family'];
            }
            $stmt_midwife->close();
        }
        
        // Also get total appointments count for Midwife
        $sql_total_midwife = "SELECT COUNT(*) as count 
                             FROM appointments a 
                             WHERE a.status != 'Canceled'
                             AND (a.health_worker_id = ? OR a.assigned_health_worker_role = ?)";
        
        $stmt_total = $conn->prepare($sql_total_midwife);
        if ($stmt_total) {
            $stmt_total->bind_param("is", $response['healthWorkerId'], $response['userRole']);
            $stmt_total->execute();
            $result_total = $stmt_total->get_result();
            if ($result_total && $row = $result_total->fetch_assoc()) {
                $response['totalAppointments'] = (int)$row['count'];
            }
            $stmt_total->close();
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    // Keep default values
    error_log("Stats error: " . $e->getMessage());
}

// Clean output and send response
while (ob_get_level() > 0) {
    ob_end_clean();
}

header('Content-Type: application/json');
echo json_encode($response);
exit;

function sendJsonError($message) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit;
}
?>