<?php
require __DIR__ . '/config.php';
require_post_with_csrf();

$in       = read_json();
$name     = trim(isset($in['name']) ? (string)$in['name'] : '');
$email    = strtolower(trim(isset($in['email']) ? (string)$in['email'] : ''));
$password = isset($in['password']) ? (string)$in['password'] : '';

$errors = [];
$nameLen = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
if ($nameLen < 2 || $nameLen > 100) {
    $errors['name'] = 'Enter your full name.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    $errors['email'] = 'Enter a valid email, like name@example.com.';
}
// bcrypt only uses the first 72 bytes, so cap there.
if (strlen($password) < 8) {
    $errors['password'] = 'Use at least 8 characters.';
} elseif (strlen($password) > 72) {
    $errors['password'] = 'Use 72 characters or fewer.';
}
if ($errors) {
    json_out(422, ['error' => 'Please fix the highlighted fields.', 'fields' => $errors]);
}

$pdo = db();
$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    json_out(409, [
        'error'  => 'An account with this email already exists. Sign in instead.',
        'fields' => ['email' => 'This email is already registered.'],
    ]);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
try {
    $ins = $pdo->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
    $ins->execute([$name, $email, $hash]);
} catch (PDOException $e) {
    // Two people registering the same email at once hits the UNIQUE rule.
    json_out(409, ['error' => 'An account with this email already exists. Sign in instead.']);
}

start_login($pdo->lastInsertId(), false);
json_out(201, ['ok' => true, 'redirect' => 'dashboard.html']);
