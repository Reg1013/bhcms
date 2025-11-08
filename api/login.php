<?php
// api/login.php - Secure login with password_verify() confirmation
require 'config.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit();
}

$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$userType = $input['userType'] ?? '';

if (empty($username) || empty($password) || empty($userType)) {
    echo json_encode(["success" => false, "message" => "All fields are required"]);
    exit();
}

// Map frontend userType to db role
$roleMapping = [
    'system_admin'    => 'system_admin',
    'barangay_health' => 'bhw',
    'health_worker'   => 'health_worker',
    'patient'         => 'patient'
];

if (!isset($roleMapping[$userType])) {
    echo json_encode(["success" => false, "message" => "Invalid user type"]);
    exit();
}

$dbRole = $roleMapping[$userType];

// === STEP 1: Fetch user with hashed password ===
$stmt = $conn->prepare("SELECT id, username, password, role FROM users WHERE username = ? AND role = ?");
$stmt->bind_param("ss", $username, $dbRole);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {

    // === STEP 2: CONFIRM PASSWORD USING password_verify() ===
    // This is the secure way: compare input password with stored hash
    if (password_verify($password, $row['password'])) {

        // === Login Success ===
        $name = $row['username'];
        $display_role = ucfirst(str_replace('_', ' ', $row['role']));

        // Fetch real name and role from profile tables
        if ($row['role'] === 'bhw') {
            $stmt2 = $conn->prepare("SELECT name FROM bhw_personnel WHERE user_id = ?");
            $stmt2->bind_param("i", $row['id']);
            $stmt2->execute();
            $nres = $stmt2->get_result();
            $name = $nres->fetch_assoc()['name'] ?? $name;
            $stmt2->close();
        } 
        elseif ($row['role'] === 'health_worker') {
            $stmt2 = $conn->prepare("SELECT name, specialty FROM health_workers WHERE user_id = ?");
            $stmt2->bind_param("i", $row['id']);
            $stmt2->execute();
            $nres = $stmt2->get_result();
            $hw = $nres->fetch_assoc();
            $stmt2->close();

            $name = $hw['name'] ?? $name;
            $display_role = match (strtolower($hw['specialty'] ?? '')) {
             'doctor'  => 'Doctor',
             'midwife' => 'Midwife',
             'nurse'   => 'Nurse',
             default   => 'Health Worker'
            };
        }
        elseif ($row['role'] === 'patient') {
            $nres = $conn->query("SELECT name FROM patients WHERE user_id = " . $row['id']);
            $name = $nres->fetch_assoc()['name'] ?? $name;
            $display_role = 'Patient';
        } 
        elseif ($row['role'] === 'system_admin') {
            $display_role = 'System Administrator';
        }

        // === Secure Session Setup ===
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'         => $row['id'],
            'username'   => $row['username'],
            'db_role'    => $row['role'],
            'role'       => $display_role,
            'user_type'  => $userType,
            'name'       => $name
        ];

        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user"    => $_SESSION['user']
        ]);

    } else {
        // === password_verify() FAILED ===
        echo json_encode(["success" => false, "message" => "Invalid username or password"]);
    }

} else {
    // === No user found ===
    echo json_encode(["success" => false, "message" => "Invalid username or password"]);
}

$stmt->close();
?>