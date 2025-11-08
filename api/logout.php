<?php
session_start();

// Clear session
$_SESSION = array();

// Destroy cookie if sent
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy session
session_destroy();

// Return success
header('Content-Type: application/json');
echo json_encode(['success' => true]);
?>