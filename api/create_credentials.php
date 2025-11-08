<?php
// api/create_credentials.php - Fixed to use 'role' instead of 'user_type'
require 'config.php';
header('Content-Type: application/json');

// === 1. AUTHORIZATION ===
if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'barangay_health') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

$creator_id = $_SESSION['user']['id'];

// === 2. GET INPUT ===
$input = json_decode(file_get_contents('php://input'), true);
$users = $input['users'] ?? [];

if (empty($users)) {
    echo json_encode(['success' => false, 'message' => 'No users provided']);
    exit;
}

$created = 0;
$errors = [];

// === 3. PROCESS EACH USER ===
foreach ($users as $u) {
    $name     = trim($u['name'] ?? '');
    $address  = trim($u['address'] ?? '');
    $role     = strtolower(trim($u['role'] ?? ''));  // ← From frontend
    $username = trim($u['username'] ?? '');
    $password = $u['password'] ?? '';
    $status   = 'Active';

    // === 3.1 Validate ===
    if (!$name || !$username || !$password || !$role) {
        $errors[] = "Missing data for user: $name";
        continue;
    }

    // === 3.2 Map role to user_type (for session/login) ===
    $role_to_type = [
        'doctor'          => 'health_worker',
        'midwife'         => 'health_worker',
        'nurse'           => 'health_worker',
        'patient'         => 'patient',
        'bhw'             => 'barangay_health',
        'barangay_health' => 'barangay_health',
        'health personnel'=> 'barangay_health'
    ];
    $user_type = $role_to_type[$role] ?? 'patient';

    // === 3.3 Check username ===
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->bind_param("s", $username);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        $errors[] = "Username '$username' already taken";
        $check->close();
        continue;
    }
    $check->close();

    // === 3.4 HASH PASSWORD ===
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // === 3.5 INSERT INTO users (using 'user_type' as role) ===
    $users_role = $user_type;  // ← Save 'health_worker', not 'doctor'
    $stmt = $conn->prepare("
        INSERT INTO users (username, name, password, role, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("sssssi", $username, $name, $hashed_password, $users_role, $status, $creator_id);

    if (!$stmt->execute()) {
        $errors[] = "Failed to create user: $username";
        $stmt->close();
        continue;
    }

    $user_id = $conn->insert_id;
    $stmt->close();

    // === 3.6 INSERT INTO PROFILE TABLE ===
    $success = false;
    if ($user_type === 'patient') {
        $q = "INSERT INTO patients (user_id, name, address) VALUES (?, ?, ?)";
        $s = $conn->prepare($q);
        $s->bind_param("iss", $user_id, $name, $address);
        $success = $s->execute();
        $s->close();
    }
    elseif ($user_type === 'health_worker') {
        $q = "INSERT INTO health_workers (user_id, name, specialty, address) VALUES (?, ?, ?, ?)";
        $s = $conn->prepare($q);
        $s->bind_param("isss", $user_id, $name, $role, $address);  // ← $role = 'doctor'
        $success = $s->execute();
        $s->close();
    }
    elseif ($user_type === 'barangay_health') {
        $q = "INSERT INTO barangay_health (user_id, name, address) VALUES (?, ?, ?)";
        $s = $conn->prepare($q);
        $s->bind_param("iss", $user_id, $name, $address);
        $success = $s->execute();
        $s->close();
    }

    if ($success) {
        $created++;
    } else {
        $errors[] = "Failed to save profile for: $name";
    }
}

// === 4. RESPONSE ===
echo json_encode([
    'success' => $created > 0,
    'created' => $created,
    'errors'  => $errors,
    'message' => $created > 0 ? "$created user(s) created successfully" : 'No users created'
]);
?>