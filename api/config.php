<?php
/* Shared setup for every API endpoint: session, database, helpers.
   Needs PHP 7.4 or newer with the PDO SQLite extension (standard on most hosts). */

// Where the database and session files live. Best practice: move this folder
// OUTSIDE your public web folder (public_html) and change the path here.
define('DATA_DIR', __DIR__ . '/../data');
define('REMEMBER_DAYS', 30);

if (!is_dir(DATA_DIR)) { mkdir(DATA_DIR, 0750, true); }
if (!is_dir(DATA_DIR . '/sessions')) { mkdir(DATA_DIR . '/sessions', 0750, true); }

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

// Keep sessions in our own folder so "keep me signed in" is not cut short
// by the host's default session cleanup.
session_save_path(DATA_DIR . '/sessions');
ini_set('session.gc_maxlifetime', (string)(REMEMBER_DAYS * 86400));
ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function json_out($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DATA_DIR . '/sfp.sqlite');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            ip TEXT NOT NULL,
            attempted_at INTEGER NOT NULL
        )');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts (email, ip, attempted_at)');
    }
    return $pdo;
}

// Reads the JSON body sent by auth.js.
function read_json() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw === false ? '' : $raw, true);
    return is_array($data) ? $data : [];
}

// Every POST must carry the token issued by csrf.php for this session.
function require_post_with_csrf() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(405, ['error' => 'Method not allowed.']);
    }
    $sent = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    $real = isset($_SESSION['csrf']) ? $_SESSION['csrf'] : '';
    if ($real === '' || !hash_equals($real, $sent)) {
        json_out(403, ['error' => 'Your session expired. Refresh the page and try again.']);
    }
}

// Start a fresh logged-in session (new id blocks session fixation).
function start_login($userId, $remember) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$userId;
    if ($remember) {
        global $isHttps;
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DAYS * 86400,
            'path'     => '/',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
