<?php
require __DIR__ . '/config.php';
require_post_with_csrf();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600, 'path' => $p['path'],
        'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax',
    ]);
}
session_destroy();
json_out(200, ['ok' => true, 'redirect' => 'login.html']);
