<?php
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

ob_start();
// === 1. CORS Headers (must be first) ===
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://gc.kis.v2.scr.kaspersky-labs.com' // Add Kaspersky domain
];

// Allow Kaspersky and localhost
if (strpos($origin, 'kaspersky-labs.com') !== false || in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (empty($origin) || !in_array($origin, $allowed)) {
    // For development, allow any origin (BE CAREFUL IN PRODUCTION)
    header("Access-Control-Allow-Origin: http://localhost");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID');
header('Access-Control-Max-Age: 86400'); // 24 hours

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// === 2. Start Session ===
if (session_status() === PHP_SESSION_NONE) {
    // Set secure session cookie parameters
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'domain' => 'localhost',
        'secure' => false, // true for HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
    
    // Regenerate ID for security
    if (!isset($_SESSION['created'])) {
        session_regenerate_id(true);
        $_SESSION['created'] = time();
    }
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
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . mysqli_connect_error()]);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');

// Set timezone
date_default_timezone_set('Asia/Manila');

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>