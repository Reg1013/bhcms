<?php
// api/get_audit_logs.php
session_start();
header('Content-Type: application/json');

// Check session
if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit();
}

// Check if user is system admin
if ($_SESSION['user']['user_type'] !== 'system_admin') {
    echo json_encode(['success' => false, 'message' => 'Access denied. System admin only.']);
    exit();
}

// Include config
require 'config.php';

try {
    // Get limit parameter
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 0;
    
    // Build query with CORRECT column names
    $sql = "SELECT 
                al.id,
                al.timestamp,
                al.user_id,
                al.action,
                al.target,
                al.ip_address  -- CORRECT: ip_address not ip
            FROM audit_logs al 
            ORDER BY al.timestamp DESC";
    
    if ($limit > 0) {
        $sql .= " LIMIT " . $limit;
    }
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        // Get user name if user_id exists
        $user_name = 'System';
        if (!empty($row['user_id'])) {
            $user_stmt = $conn->prepare("SELECT name FROM users WHERE id = ?");
            $user_stmt->bind_param("i", $row['user_id']);
            $user_stmt->execute();
            $user_result = $user_stmt->get_result();
            if ($user_row = $user_result->fetch_assoc()) {
                $user_name = $user_row['name'];
            }
            $user_stmt->close();
        }
        
        $logs[] = [
            'id' => $row['id'],
            'timestamp' => $row['timestamp'],
            'user' => $user_name,
            'action' => $row['action'],
            'target' => $row['target'],
            'ip' => $row['ip_address']  // Map ip_address to ip for frontend
        ];
    }
    
    // Return success
    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'count' => count($logs)
    ]);
    
} catch (Exception $e) {
    // Return error
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching audit logs',
        'error' => $e->getMessage()
    ]);
}

// Close connection
if (isset($conn)) {
    $conn->close();
}
?>