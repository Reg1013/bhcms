<?php
// api/login.php - MINIMAL FIX FOR BHW
session_start();
require 'config.php';

header('Content-Type: application/json');

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

// Map frontend userType to database user_type
$typeMapping = [
    'system_admin'    => 'system_admin',
    'barangay_health' => 'bhw',           // This maps to 'bhw' in database
    'health_worker'   => 'health_worker',
    'patient'         => 'patient'
];

if (!isset($typeMapping[$userType])) {
    echo json_encode(["success" => false, "message" => "Invalid user type"]);
    exit();
}

$dbUserType = $typeMapping[$userType];

// Fetch user
$stmt = $conn->prepare("SELECT id, username, password, name, user_type, email, status FROM users WHERE username = ? AND user_type = ?");
$stmt->bind_param("ss", $username, $dbUserType);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    
    // Check if user is active
    if (isset($row['status']) && $row['status'] !== 'Active') {
        echo json_encode(["success" => false, "message" => "Account is inactive. Please contact administrator."]);
        exit();
    }

    // Verify password
    if (password_verify($password, $row['password'])) {

        $name = $row['name'] ?? $row['username'];
        $redirect_url = '';
        
        // Set redirect URL based on user type
        if ($row['user_type'] === 'bhw') {
            $redirect_url = 'health-dashboard.html';
        } elseif ($row['user_type'] === 'health_worker') {
            $redirect_url = 'health-worker-dashboard.html';
        } elseif ($row['user_type'] === 'patient') {
            $redirect_url = 'patient-dashboard.html';
        } elseif ($row['user_type'] === 'system_admin') {
            $redirect_url = 'admin-dashboard.html';
        }

        // Set session - MINIMAL SESSION DATA
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'         => $row['id'],
            'username'   => $row['username'],
            'name'       => $name,
            'user_type'  => $row['user_type'], // This is 'bhw' for barangay health
            'email'      => $row['email'] ?? '',
            'status'     => $row['status'] ?? 'Active'
            // NO 'role' field here - it will be added in current_user.php if needed
        ];

        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user"    => $_SESSION['user'],
            "redirect_url" => $redirect_url
        ]);

    } else {
        echo json_encode(["success" => false, "message" => "Invalid username or password"]);
    }

} else {
    echo json_encode(["success" => false, "message" => "Invalid username or password"]);
}

$stmt->close();
$conn->close();
?>