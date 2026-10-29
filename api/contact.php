<?php
require __DIR__ . '/config.php';
require_post_with_csrf();

$topics = ['Course enquiry', 'Enrolment and payment', 'Certificates', 'Technical help', 'Something else'];

$in      = read_json();
$name    = trim(isset($in['name']) ? (string)$in['name'] : '');
$email   = trim(isset($in['email']) ? (string)$in['email'] : '');
$topic   = trim(isset($in['topic']) ? (string)$in['topic'] : '');
$message = trim(isset($in['message']) ? (string)$in['message'] : '');
$trap    = isset($in['website']) ? (string)$in['website'] : '';
$ip      = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';

// Hidden field that people never see. Bots fill it in; we pretend it worked and drop the message.
if ($trap !== '') {
    json_out(200, ['ok' => true]);
}

$len = function ($v) { return function_exists('mb_strlen') ? mb_strlen($v) : strlen($v); };
$errors = [];
if ($len($name) < 2 || $len($name) > 100) { $errors['name'] = 'Enter your full name.'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    $errors['email'] = 'Enter a valid email, like name@example.com.';
}
if (!in_array($topic, $topics, true)) { $errors['topic'] = 'Choose a topic.'; }
if ($len($message) < 10) { $errors['message'] = 'Write at least 10 characters so we can help.'; }
elseif ($len($message) > 2000) { $errors['message'] = 'Keep the message under 2000 characters.'; }
if ($errors) {
    json_out(422, ['error' => 'Please fix the highlighted fields.', 'fields' => $errors]);
}

$pdo = db();

// At most 3 messages per device per hour.
$c = $pdo->prepare("SELECT COUNT(*) AS n FROM messages WHERE ip = ? AND created_at >= datetime('now', '-1 hour')");
$c->execute([$ip]);
$row = $c->fetch();
if ((int)$row['n'] >= 3) {
    json_out(429, ['error' => 'You have sent several messages already. Please wait an hour and try again.']);
}

$ins = $pdo->prepare('INSERT INTO messages (name, email, topic, message, ip) VALUES (?, ?, ?, ?, ?)');
$ins->execute([$name, $email, $topic, $message, $ip]);
$id = (int)$pdo->lastInsertId();

// Email it to the institute. Line breaks are stripped from header values to block header injection.
function one_line($v) { return trim(preg_replace('/[\r\n]+/', ' ', $v)); }

$emailed = false;
if (strpos(CONTACT_TO_EMAIL, 'yourdomain.com') === false) {
    $subject = '[SFP website] ' . $topic . ' - ' . one_line($name);
    $body = "New message from the website contact form\n\n"
          . "Name: " . one_line($name) . "\n"
          . "Email: " . one_line($email) . "\n"
          . "Topic: " . $topic . "\n\n"
          . $message . "\n";
    $headers = "From: SFP Website <" . CONTACT_FROM_EMAIL . ">\r\n"
             . "Reply-To: " . one_line($email) . "\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n";
    $emailed = @mail(CONTACT_TO_EMAIL, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
    if ($emailed) {
        $pdo->prepare('UPDATE messages SET emailed = 1 WHERE id = ?')->execute([$id]);
    }
}

json_out(201, ['ok' => true]);
