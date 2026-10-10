<?php

declare(strict_types=1);

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/learner.php';
require __DIR__ . '/lib/gemini.php';
require __DIR__ . '/lib/tutor.php';
require __DIR__ . '/lib/calls.php';
require __DIR__ . '/lib/billing.php';

date_default_timezone_set('UTC');
ini_set('display_errors', '0');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base));
}
$path = '/' . trim($path, '/');

try {
    header('Access-Control-Allow-Origin: ' . (config()['cors_origin'] ?? '*'));
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    switch ("$method $path") {
        case 'GET /health':
            db()->query('SELECT 1');
            send_json(200, ['ok' => true]);

        case 'POST /auth/register':
            send_json(201, register_user(read_json()));

        case 'POST /auth/login':
            send_json(200, login_user(read_json()));

        case 'POST /auth/logout':
            logout_user();
            send_json(200, ['ok' => true]);

        case 'GET /me':
            send_json(200, me_payload(require_user()));

        case 'PUT /profile':
            send_json(200, ['profile' => save_profile(require_user()['id'], read_json())]);

        case 'POST /progress/lessons':
            send_json(200, complete_lesson(require_user()['id'], read_json()));

        case 'POST /tutor':
            send_json(200, tutor_request(require_user()));

        case 'POST /billing/purchase':
            send_json(200, ['profile' => confirm_play_purchase(require_user()['id'], read_json())]);

        case 'POST /billing/reward':
            send_json(200, ['profile' => grant_ad_reward(require_user()['id'])]);

        case 'POST /calls/join':
            send_json(200, call_sync(require_user()['id'], 0, true, 0));

        case 'GET /calls':
            send_json(200, call_sync(
                require_user()['id'],
                (int) ($_GET['after'] ?? 0),
                false,
                (int) ($_GET['call'] ?? 0)
            ));

        case 'POST /calls/leave':
            leave_call(require_user()['id']);
            send_json(200, ['ok' => true]);

        case 'POST /calls/clips':
            send_json(201, save_call_clip(require_user()['id']));

        default:
            throw new ApiError(404, 'not_found', 'Unknown endpoint.');
    }
} catch (ApiError $e) {
    send_json($e->status, ['error' => ['code' => $e->errorCode, 'message' => $e->getMessage()]]);
} catch (AiError $e) {
    error_log($e->getMessage());
    send_json(502, ['error' => ['code' => 'ai_failed', 'message' => 'The AI tutor had a problem. Please try again.']]);
} catch (Throwable $e) {
    error_log($e::class . ': ' . $e->getMessage());
    send_json(500, ['error' => ['code' => 'server_error', 'message' => 'Something went wrong on the server.']]);
}
