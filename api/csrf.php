<?php
require __DIR__ . '/config.php';
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
json_out(200, ['token' => $_SESSION['csrf']]);
