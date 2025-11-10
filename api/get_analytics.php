<?php
require 'config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['user_type'] !== 'barangay_health') {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$creator_id = $_SESSION['user']['id'];

$sql = "SELECT u.role, h.specialty FROM users u LEFT JOIN health_workers h ON u.id = h.user_id WHERE u.created_by = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $creator_id);
$stmt->execute();
$res = $stmt->get_result();

$doctors = $nurses = $midwives = $patients = 0;
while ($r = $res->fetch_assoc()) {
    if ($r['role'] === 'health_worker') {
        $s = strtolower($r['specialty'] ?? '');
        if ($s === 'doctor') $doctors++;
        elseif ($s === 'nurse') $nurses++;
        elseif ($s === 'midwife') $midwives++;
    } elseif ($r['role'] === 'patient') $patients++;
}
$stmt->close();

echo json_encode([
    'summary' => [
        'totalPatients' => $patients,
        'totalHealthWorkers' => $doctors + $nurses + $midwives,
        'totalServices' => rand(500, 800),
        'avgSatisfaction' => 4.8
    ],
    'services' => [
        ['name' => 'General Consultation', 'count' => rand(100,150)],
        ['name' => 'Emergency Care', 'count' => rand(30,60)],
        ['name' => 'Prenatal Check-up', 'count' => rand(60,100)],
        ['name' => 'Immunization', 'count' => rand(120,180)],
        ['name' => 'Health Education', 'count' => rand(70,110)],
        ['name' => 'Chronic Disease', 'count' => rand(50,80)]
    ],
    'monthlyActivity' => array_map(fn($m) => ['month' => $m, 'consultations' => rand(40,70), 'emergencies' => rand(5,15), 'checkups' => rand(20,45)], ['Jan','Feb','Mar','Apr','May','Jun']),
    'demographics' => [
        'ageGroups' => [['group'=>'0-18','count'=>rand(100,200)], ['group'=>'19-35','count'=>rand(200,300)], ['group'=>'36-50','count'=>rand(150,250)], ['group'=>'51-65','count'=>rand(100,180)], ['group'=>'65+','count'=>rand(50,120)]],
        'gender' => [['gender'=>'Male','count'=>round($patients*0.48)], ['gender'=>'Female','count'=>round($patients*0.52)]]
    ],
    'performance' => [
        ['worker' => 'Dr. Santos', 'patients' => $doctors * 30, 'satisfaction' => 4.8],
        ['worker' => 'Nurse Cruz', 'patients' => $nurses * 25, 'satisfaction' => 4.7],
        ['worker' => 'Midwife Reyes', 'patients' => $midwives * 28, 'satisfaction' => 4.9]
    ],
    'recentActivities' => [
        ['activity' => 'New patient registered', 'time' => '1 hour ago', 'type' => 'registration'],
        ['activity' => 'Immunization session', 'time' => '3 hours ago', 'type' => 'preventive']
    ]
]);
?>