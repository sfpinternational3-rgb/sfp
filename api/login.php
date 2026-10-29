<?php
require __DIR__ . '/config.php';
require_post_with_csrf();

$in       = read_json();
$email    = strtolower(trim(isset($in['email']) ? (string)$in['email'] : ''));
$password = isset($in['password']) ? (string)$in['password'] : '';
$remember = !empty($in['remember']);
$ip       = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';

if ($email === '' || $password === '' || strlen($password) > 72) {
    json_out(401, ['error' => 'Email or password is incorrect. Check both and try again.']);
}

$pdo = db();

// Allow 5 failed tries per email and device in 15 minutes.
$window = time() - 15 * 60;
$pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < ?')->execute([$window]);
$count = $pdo->prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND ip = ? AND attempted_at >= ?');
$count->execute([$email, $ip, $window]);
$row = $count->fetch();
if ((int)$row['n'] >= 5) {
    json_out(429, ['error' => 'Too many failed attempts. Wait 15 minutes and try again.']);
}

$q = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$q->execute([$email]);
$user = $q->fetch();

// Always run a password check so a missing account takes as long as a wrong password.
$dummy = '$2y$10$usesomesillystringforsaltuQ0aP8l8o5yX3w1e2r3t4y5u6i7o';
$valid = password_verify($password, $user ? $user['password_hash'] : $dummy);

if (!$user || !$valid) {
    $pdo->prepare('INSERT INTO login_attempts (email, ip, attempted_at) VALUES (?, ?, ?)')
        ->execute([$email, $ip, time()]);
    json_out(401, ['error' => 'Email or password is incorrect. Check both and try again.']);
}

// Success: clear the failed tries and upgrade the hash if PHP's default got stronger.
$pdo->prepare('DELETE FROM login_attempts WHERE email = ? AND ip = ?')->execute([$email, $ip]);
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

start_login($user['id'], $remember);
json_out(200, ['ok' => true, 'redirect' => 'dashboard.html']);
