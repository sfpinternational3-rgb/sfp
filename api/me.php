<?php
require __DIR__ . '/config.php';
if (empty($_SESSION['user_id'])) {
    json_out(401, ['error' => 'Not signed in.']);
}
$q = db()->prepare('SELECT full_name, email FROM users WHERE id = ?');
$q->execute([$_SESSION['user_id']]);
$u = $q->fetch();
if (!$u) {
    session_destroy();
    json_out(401, ['error' => 'Not signed in.']);
}
json_out(200, ['name' => $u['full_name'], 'email' => $u['email']]);
