<?php
// check_users.php
$host = 'localhost';
$dbname = 'bhcms';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT id, username, role FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Users in Database</h2>";
    echo "<table border='1'>";
    echo "<tr><th>ID</th><th>Username</th><th>Role</th></tr>";
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>{$user['id']}</td>";
        echo "<td>{$user['username']}</td>";
        echo "<td>{$user['role']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>