<?php
// debug_session.php
session_start();
header('Content-Type: application/json');

echo json_encode([
    "session_id" => session_id(),
    "session_status" => session_status(),
    "session_data" => $_SESSION,
    "cookie_data" => $_COOKIE,
    "headers_list" => headers_list()
]);
?>