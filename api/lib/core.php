<?php

declare(strict_types=1);

const LANGUAGES = ['de', 'en', 'fr'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

final class ApiError extends Exception
{
    public function __construct(public readonly int $status, public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) {
            throw new ApiError(500, 'not_configured', 'Server is missing config.php.');
        }
        $config = require $path;
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']);
        $pdo = new PDO($dsn, $c['user'], $c['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

function send_json(int $status, array $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiError(400, 'invalid_json', 'Request body must be a JSON object.');
    }
    return $data;
}

/** Multipart form fields when present, otherwise the JSON body. */
function read_input(): array
{
    return $_POST ? $_POST : read_json();
}

function str_field(array $input, string $key, int $maxLength, bool $required = true): ?string
{
    $value = $input[$key] ?? null;
    if ($value === null || (is_string($value) && trim($value) === '')) {
        if ($required) {
            throw new ApiError(422, 'missing_field', "Missing field: $key.");
        }
        return null;
    }
    if (!is_string($value)) {
        throw new ApiError(422, 'invalid_field', "Field $key must be a string.");
    }
    $value = trim($value);
    if (mb_strlen($value) > $maxLength) {
        throw new ApiError(422, 'invalid_field', "Field $key is too long.");
    }
    return $value;
}

function language_field(array $input, string $key): string
{
    $value = str_field($input, $key, 2);
    if (!in_array($value, LANGUAGES, true)) {
        throw new ApiError(422, 'invalid_language', "Field $key must be one of: " . implode(', ', LANGUAGES) . '.');
    }
    return $value;
}

function level_field(array $input, string $key): string
{
    $value = str_field($input, $key, 2, false) ?? 'A1';
    if (!in_array($value, LEVELS, true)) {
        throw new ApiError(422, 'invalid_level', "Field $key must be one of: " . implode(', ', LEVELS) . '.');
    }
    return $value;
}

/**
 * The learner's local calendar day (YYYY-MM-DD). Time zones span UTC-12 to UTC+14,
 * so anything within a day of the server's UTC date is accepted.
 */
function day_field(array $input, string $key = 'day'): string
{
    $value = str_field($input, $key, 10);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
    if ($date === false || $date->format('Y-m-d') !== $value) {
        throw new ApiError(422, 'invalid_day', "Field $key must be a date like 2026-01-31.");
    }
    $today = new DateTimeImmutable('today', new DateTimeZone('UTC'));
    $diffDays = (int) $today->diff($date)->format('%r%a');
    if ($diffDays < -1 || $diffDays > 1) {
        throw new ApiError(422, 'invalid_day', "Field $key is too far from today.");
    }
    return $value;
}

/** Accepts either an array or a JSON-encoded string (multipart forms can only send strings). */
function json_field(array $input, string $key): ?array
{
    $value = $input[$key] ?? null;
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value)) {
        $value = json_decode($value, true);
    }
    if (!is_array($value)) {
        throw new ApiError(422, 'invalid_field', "Field $key must be JSON.");
    }
    return $value;
}
