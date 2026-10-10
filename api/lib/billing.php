<?php

declare(strict_types=1);

const PLAY_PRODUCTS = [
    'aloro_day' => 'day',
    'aloro_week' => 'week',
    'aloro_month' => 'month',
    'aloro_year' => 'year',
];

const PLAY_ACTIVE_STATES = [
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    'SUBSCRIPTION_STATE_CANCELED',
];

function play_ready(): bool
{
    $path = (string) (config()['play']['service_account_json'] ?? '');
    return $path !== '' && is_file($path);
}

function play_package(): string
{
    $package = (string) (config()['play']['package_name'] ?? 'com.aloro.app');
    if (!preg_match('/^[a-zA-Z0-9._]+$/', $package)) {
        throw new ApiError(500, 'server_error', 'The Play package name is not configured.');
    }
    return $package;
}

function play_b64(string $raw): string
{
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function play_access_token(): string
{
    static $token = null;
    static $expires = 0;
    if (is_string($token) && $expires > time() + 60) {
        return $token;
    }
    if (!play_ready()) {
        throw new ApiError(503, 'billing_not_configured', 'Payments are not set up on the server yet.');
    }

    $account = json_decode((string) file_get_contents((string) config()['play']['service_account_json']), true);
    $email = is_array($account) ? (string) ($account['client_email'] ?? '') : '';
    $key = is_array($account) ? (string) ($account['private_key'] ?? '') : '';
    if ($email === '' || $key === '') {
        throw new ApiError(503, 'billing_not_configured', 'Payments are not set up on the server yet.');
    }

    $now = time();
    $header = play_b64((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim = play_b64((string) json_encode([
        'iss' => $email,
        'scope' => 'https://www.googleapis.com/auth/androidpublisher',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ]));
    $unsigned = $header . '.' . $claim;
    if (!openssl_sign($unsigned, $signature, $key, OPENSSL_ALGO_SHA256)) {
        throw new ApiError(500, 'server_error', 'Could not sign the Play request.');
    }
    $jwt = $unsigned . '.' . play_b64($signature);

    $response = play_http('POST', 'https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ], null);
    $access = (string) ($response['access_token'] ?? '');
    if ($access === '') {
        throw new ApiError(502, 'purchase_invalid', 'Google Play did not confirm this payment.');
    }
    $token = $access;
    $expires = $now + (int) ($response['expires_in'] ?? 3600);
    return $access;
}

/** @return array<string, mixed> */
function play_http(string $method, string $url, ?array $form, ?string $bearer, bool $jsonBody = false): array
{
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($bearer !== null) {
        $headers[] = 'Authorization: Bearer ' . $bearer;
    }
    $options = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($jsonBody) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = '{}';
    } elseif ($form !== null) {
        $options[CURLOPT_POSTFIELDS] = http_build_query($form);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($raw === false || $status < 200 || $status >= 300) {
        error_log('Play API ' . $status . ': ' . substr((string) $raw, 0, 300));
        throw new ApiError($bearer === null ? 502 : 402, 'purchase_invalid', 'Google Play did not confirm this payment.');
    }
    if (trim((string) $raw) === '') {
        return [];
    }
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        error_log('Play API ' . $status . ': ' . substr((string) $raw, 0, 300));
        throw new ApiError(402, 'purchase_invalid', 'Google Play did not confirm this payment.');
    }
    return $data;
}

function play_api(string $method, string $path): array
{
    $url = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'
        . rawurlencode(play_package()) . '/' . $path;
    return play_http($method, $url, null, play_access_token(), $method === 'POST');
}

/**
 * What this purchase entitles the learner to, or null when it is refunded or expired.
 *
 * @return array{plan: string, expires: string}|null
 */
function play_entitlement(string $productId, string $token, bool $settle): ?array
{
    $plan = PLAY_PRODUCTS[$productId] ?? null;
    if ($plan === null || strlen($token) < 8 || strlen($token) > 8000 || preg_match('/\s/', $token)) {
        throw new ApiError(422, 'purchase_invalid', 'This purchase could not be read.');
    }
    $encoded = rawurlencode($token);

    if ($plan === 'day') {
        $purchase = play_api('GET', 'purchases/products/' . rawurlencode($productId) . '/tokens/' . $encoded);
        if ((int) ($purchase['purchaseState'] ?? 1) !== 0) {
            return null;
        }
        $boughtAt = (int) ($purchase['purchaseTimeMillis'] ?? 0);
        if ($boughtAt <= 0) {
            throw new ApiError(402, 'purchase_invalid', 'Google Play did not confirm this payment.');
        }
        if ($settle && (int) ($purchase['consumptionState'] ?? 0) === 0) {
            play_api('POST', 'purchases/products/' . rawurlencode($productId) . '/tokens/' . $encoded . ':consume');
        }
        $expires = (new DateTimeImmutable('@' . intdiv($boughtAt, 1000)))
            ->setTimezone(new DateTimeZone('UTC'))
            ->modify('+1 day');
        return ['plan' => 'day', 'expires' => $expires->format('Y-m-d H:i:s')];
    }

    $subscription = play_api('GET', 'purchases/subscriptionsv2/tokens/' . $encoded);
    $state = (string) ($subscription['subscriptionState'] ?? '');
    $line = null;
    foreach ($subscription['lineItems'] ?? [] as $item) {
        if (($item['productId'] ?? '') === $productId) {
            $line = $item;
            break;
        }
    }
    if (!is_array($line) || !in_array($state, PLAY_ACTIVE_STATES, true)) {
        return null;
    }
    $expiry = new DateTimeImmutable((string) ($line['expiryTime'] ?? ''));
    $expiry = $expiry->setTimezone(new DateTimeZone('UTC'));
    if ($expiry <= new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
        return null;
    }
    if ($settle && ($subscription['acknowledgementState'] ?? '') === 'ACKNOWLEDGEMENT_STATE_PENDING') {
        play_api('POST', 'purchases/subscriptions/' . rawurlencode($productId) . '/tokens/' . $encoded . ':acknowledge');
    }
    return ['plan' => $plan, 'expires' => $expiry->format('Y-m-d H:i:s')];
}

function save_entitlement(int $userId, string $productId, string $token, array $grant): array
{
    $hash = hash('sha256', $token);
    $owner = db()->prepare('SELECT user_id FROM profiles WHERE google_token_hash = ? AND user_id <> ?');
    $owner->execute([$hash, $userId]);
    if ($owner->fetch()) {
        throw new ApiError(409, 'purchase_invalid', 'This purchase is already linked to another account.');
    }
    db()->prepare(
        'UPDATE profiles
         SET plan = ?, plan_expires_at = ?, google_product_id = ?, google_purchase_token = ?, google_token_hash = ?
         WHERE user_id = ?'
    )->execute([$grant['plan'], $grant['expires'], $productId, $token, $hash, $userId]);
    $profile = load_profile($userId);
    if (!$profile) {
        throw new ApiError(500, 'server_error', 'Could not save the plan.');
    }
    return $profile;
}

function clear_entitlement(int $userId): void
{
    db()->prepare(
        'UPDATE profiles
         SET plan = \'free\', plan_expires_at = NULL, google_product_id = NULL, google_purchase_token = NULL, google_token_hash = NULL
         WHERE user_id = ?'
    )->execute([$userId]);
}

function confirm_play_purchase(int $userId, array $input): array
{
    if (!profile_row($userId)) {
        throw new ApiError(422, 'no_profile', 'Finish setup before choosing a plan.');
    }
    $productId = str_field($input, 'productId', 64);
    $token = str_field($input, 'purchaseToken', 8000);
    if (!isset(PLAY_PRODUCTS[$productId])) {
        throw new ApiError(422, 'invalid_plan', 'Unknown product.');
    }
    $grant = play_entitlement($productId, $token, true);
    if ($grant === null) {
        throw new ApiError(402, 'purchase_invalid', 'Google Play did not confirm this payment.');
    }
    return save_entitlement($userId, $productId, $token, $grant);
}

/** Drop a refunded or expired Play purchase. Leaves the plan alone when Play cannot be reached. */
function refresh_play_purchase(int $userId): void
{
    if (!play_ready()) {
        return;
    }
    $row = profile_row($userId);
    $productId = (string) ($row['google_product_id'] ?? '');
    $token = (string) ($row['google_purchase_token'] ?? '');
    if ($row === null || $productId === '' || $token === '' || !isset(PLAY_PRODUCTS[$productId])) {
        return;
    }
    try {
        $grant = play_entitlement($productId, $token, false);
        if ($grant === null) {
            clear_entitlement($userId);
            return;
        }
        save_entitlement($userId, $productId, $token, $grant);
    } catch (Throwable $e) {
        error_log('Play refresh failed: ' . $e->getMessage());
    }
}

/** A free learner watched a rewarded ad. Five extra checks, twice a day. */
function grant_ad_reward(int $userId): array
{
    if (!profile_row($userId)) {
        throw new ApiError(422, 'no_profile', 'Finish setup before practicing.');
    }
    if (active_plan($userId) !== 'free') {
        throw new ApiError(422, 'not_free', 'A paid plan already includes these speaking checks.');
    }
    $db = db();
    $db->prepare(
        'INSERT INTO ai_usage (user_id, day, requests, bonus, rewards) VALUES (?, UTC_DATE(), 0, 0, 0)
         ON DUPLICATE KEY UPDATE user_id = user_id'
    )->execute([$userId]);
    $stmt = $db->prepare('SELECT rewards FROM ai_usage WHERE user_id = ? AND day = UTC_DATE()');
    $stmt->execute([$userId]);
    if ((int) $stmt->fetchColumn() >= 2) {
        throw new ApiError(429, 'reward_limit', 'You have already watched the extra ads for today.');
    }
    $db->prepare(
        'UPDATE ai_usage SET bonus = bonus + 5, rewards = rewards + 1 WHERE user_id = ? AND day = UTC_DATE()'
    )->execute([$userId]);
    $profile = load_profile($userId);
    if (!$profile) {
        throw new ApiError(500, 'server_error', 'Could not save the extra checks.');
    }
    return $profile;
}
