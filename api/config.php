<?php
// api/config.php - Secure DB connection with dynamic CORS

// === 1. CORS Headers (must be first) ===
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:8080',
    'http://localhost:3000' // Add if you use dev server
];

if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// === 2. Start Session ===
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// === 3. Database Connection ===
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'bhcms');

$conn = mysqli_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

if (!$conn) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');
?>