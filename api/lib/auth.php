<?php

declare(strict_types=1);

function issue_token(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $days = (int) (config()['token_days'] ?? 60);

    $db = db();
    $db->prepare('DELETE FROM auth_tokens WHERE user_id = ? AND expires_at < UTC_TIMESTAMP()')->execute([$userId]);
    $db->prepare('INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ? DAY)')
        ->execute([$userId, hash('sha256', $token), $days]);

    return $token;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if ($header === null && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }
    if (!is_string($header) || !preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($header), $m)) {
        return null;
    }
    return strtolower($m[1]);
}

/** @return array{id:int,email:string} */
function require_user(): array
{
    $token = bearer_token();
    if ($token === null) {
        throw new ApiError(401, 'unauthorized', 'Sign in required.');
    }
    $stmt = db()->prepare(
        'SELECT u.id, u.email FROM auth_tokens t JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ? AND t.expires_at > UTC_TIMESTAMP()'
    );
    $stmt->execute([hash('sha256', $token)]);
    $user = $stmt->fetch();
    if (!$user) {
        throw new ApiError(401, 'unauthorized', 'Your session has expired. Please sign in again.');
    }
    return ['id' => (int) $user['id'], 'email' => $user['email']];
}

function credentials(array $input): array
{
    $email = strtolower(str_field($input, 'email', 255));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ApiError(422, 'invalid_email', 'Enter a valid email address.');
    }
    $password = $input['password'] ?? null;
    if (!is_string($password) || strlen($password) < 8 || strlen($password) > 200) {
        throw new ApiError(422, 'invalid_password', 'Password must be at least 8 characters.');
    }
    return [$email, $password];
}

function register_user(array $input): array
{
    [$email, $password] = credentials($input);
    $db = db();
    try {
        $db->prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
            ->execute([$email, password_hash($password, PASSWORD_DEFAULT)]);
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) {
            throw new ApiError(409, 'email_taken', 'An account with this email already exists.');
        }
        throw $e;
    }
    $userId = (int) $db->lastInsertId();
    return ['token' => issue_token($userId), 'user' => ['id' => $userId, 'email' => $email]];
}

function login_user(array $input): array
{
    [$email, $password] = credentials($input);
    $stmt = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    $userId = (int) $row['id'];
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);
    }
    return ['token' => issue_token($userId), 'user' => ['id' => $userId, 'email' => $email]];
}

function logout_user(): void
{
    $token = bearer_token();
    if ($token !== null) {
        db()->prepare('DELETE FROM auth_tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
}
