<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$user_id = $_SESSION['user']['id'];
$user_type = $_SESSION['user']['user_type'];

try {
    if ($user_type === 'health_worker') {
        // ========== HEALTH WORKER PROFILE UPDATE ==========
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $license = trim($input['license'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $shift = trim($input['shift'] ?? '');
        $specialization = trim($input['specialization'] ?? '');

        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            exit;
        }

        // Start transaction
        $conn->begin_transaction();

        // Update health_workers table
        $stmt = $conn->prepare("
            UPDATE health_workers 
            SET name = ?, specialty = ?, license_number = ?, phone = ?, shift = ?
            WHERE user_id = ?
        ");
        $stmt->bind_param("sssssi", $name, $specialization, $license, $phone, $shift, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update health_worker profile: ' . $stmt->error);
        }
        $stmt->close();

        // Update users table email if provided and different
        if (!empty($email) && $email !== ($_SESSION['user']['email'] ?? '')) {
            $stmt = $conn->prepare("UPDATE users SET email = ? WHERE id = ?");
            $stmt->bind_param("si", $email, $user_id);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to update email: ' . $stmt->error);
            }
            $stmt->close();
            
            // Update session email
            $_SESSION['user']['email'] = $email;
        }

        // Commit transaction
        $conn->commit();

        // Update session data
        $_SESSION['user']['name'] = $name;
        $_SESSION['user']['specialty'] = $specialization;
        
        // Map specialty to role for display
        $role = match(strtolower($specialization)) {
            'doctor' => 'Doctor',
            'nurse' => 'Nurse', 
            'midwife' => 'Midwife',
            default => 'Health Worker'
        };
        $_SESSION['user']['role'] = $role;

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'role' => $role
        ]);

    } elseif ($user_type === 'patient') {
        // ========== PATIENT PROFILE UPDATE ==========
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $address = trim($input['address'] ?? '');
        $dob = trim($input['dob'] ?? '');
        $gender = trim($input['gender'] ?? ''); // FIXED: This should be gender, not dob
        $blood_type = trim($input['blood_type'] ?? '');

        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            exit;
        }

        // Check if patient profile exists
        $check_stmt = $conn->prepare("SELECT user_id FROM patients WHERE user_id = ?");
        $check_stmt->bind_param("i", $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows > 0) {
            // Update existing patient profile
            $stmt = $conn->prepare("
                UPDATE patients 
                SET phone = ?, address = ?, date_of_birth = ?, gender = ?, blood_type = ?
                WHERE user_id = ?
            ");
            $stmt->bind_param("sssssi", $phone, $address, $dob, $gender, $blood_type, $user_id);
        } else {
            // Insert new patient profile
            $stmt = $conn->prepare("
                INSERT INTO patients (user_id, phone, address, date_of_birth, gender, blood_type) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("isssss", $user_id, $phone, $address, $dob, $gender, $blood_type);
        }
        
        if ($stmt->execute()) {
            // Also update the users table for name and email
            $user_stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
            $user_stmt->bind_param("ssi", $name, $email, $user_id);
            $user_stmt->execute();
            $user_stmt->close();
            
            // Update session data
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['email'] = $email;
            
            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
        } else {
            throw new Exception('Failed to update patient profile: ' . $stmt->error);
        }
        
        $stmt->close();
        $check_stmt->close();

    } else {
        // ========== OTHER USER TYPES (bhw, system_admin) ==========
        echo json_encode(['success' => false, 'message' => 'Profile update not available for your user type']);
    }
    
} catch (Exception $e) {
    // Rollback transaction if it was started (for health workers)
    if (isset($conn) && $user_type === 'health_worker') {
        $conn->rollback();
    }
    
    error_log("Profile update error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update profile: ' . $e->getMessage()
    ]);
}
?>