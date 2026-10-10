<?php

declare(strict_types=1);

const CALL_AUDIO_EXTENSIONS = ['m4a', 'mp4', 'mp3', 'mpeg', 'mpga', 'wav', 'webm', 'ogg', 'flac', 'aac'];

function call_dir(): string
{
    $dir = __DIR__ . '/../data/calls';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new ApiError(500, 'server_error', 'Could not store the recording.');
    }
    return $dir;
}

function expire_due_calls(PDO $db): void
{
    $db->exec('UPDATE calls SET ended_at = UTC_TIMESTAMP() WHERE ended_at IS NULL AND ends_at <= UTC_TIMESTAMP()');
}

/** Drop recordings from calls that ended more than an hour ago. */
function purge_old_call_files(): void
{
    $stmt = db()->query(
        'SELECT c.id, c.filename FROM call_clips c
         INNER JOIN calls k ON k.id = c.call_id
         WHERE k.ended_at IS NOT NULL AND k.ended_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)
         LIMIT 40'
    );
    $ids = [];
    $dir = call_dir();
    foreach ($stmt->fetchAll() as $row) {
        $name = (string) $row['filename'];
        if (preg_match('/^[a-f0-9]{32}\.[a-z0-9]+$/', $name)) {
            $path = $dir . '/' . $name;
            if (is_file($path)) {
                unlink($path);
            }
        }
        $ids[] = (int) $row['id'];
    }
    if ($ids) {
        db()->exec('DELETE FROM call_clips WHERE id IN (' . implode(',', $ids) . ')');
    }
}

function lock_live_call(PDO $db, int $userId): ?array
{
    $stmt = $db->prepare(
        'SELECT * FROM calls WHERE ended_at IS NULL AND (user_a = ? OR user_b = ?) ORDER BY id DESC LIMIT 1 FOR UPDATE'
    );
    $stmt->execute([$userId, $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function lock_call_for_user(PDO $db, int $callId, int $userId): ?array
{
    $stmt = $db->prepare('SELECT * FROM calls WHERE id = ? AND (user_a = ? OR user_b = ?) FOR UPDATE');
    $stmt->execute([$callId, $userId, $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function seconds_left(array $call): int
{
    $ends = new DateTimeImmutable((string) $call['ends_at'], new DateTimeZone('UTC'));
    return max(0, $ends->getTimestamp() - time());
}

function call_clips_payload(int $callId, int $userId, int $afterId): array
{
    $stmt = db()->prepare(
        'SELECT id, filename FROM call_clips
         WHERE call_id = ? AND user_id <> ? AND id > ?
         ORDER BY id LIMIT 5'
    );
    $stmt->execute([$callId, $userId, $afterId]);
    $dir = call_dir();
    $clips = [];
    foreach ($stmt->fetchAll() as $row) {
        $name = (string) $row['filename'];
        if (!preg_match('/^[a-f0-9]{32}\.([a-z0-9]+)$/', $name, $match)) {
            continue;
        }
        $path = $dir . '/' . $name;
        if (!is_file($path)) {
            continue;
        }
        $audio = file_get_contents($path);
        if ($audio === false) {
            continue;
        }
        $clips[] = [
            'id' => (int) $row['id'],
            'extension' => $match[1],
            'audioBase64' => base64_encode($audio),
        ];
    }
    return $clips;
}

function call_payload(string $status, ?array $call, int $userId, int $afterId): array
{
    if ($call === null) {
        return ['status' => $status, 'call' => null, 'clips' => []];
    }
    return [
        'status' => $status,
        'call' => [
            'id' => (int) $call['id'],
            'language' => $call['target_language'],
            'level' => $call['level'],
            'secondsLeft' => $status === 'matched' ? seconds_left($call) : 0,
        ],
        'clips' => call_clips_payload((int) $call['id'], $userId, $afterId),
    ];
}

function upsert_queue(PDO $db, int $userId, array $profile): void
{
    $db->prepare(
        'INSERT INTO call_queue (user_id, target_language, level, joined_at) VALUES (?, ?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE target_language = VALUES(target_language), level = VALUES(level), joined_at = UTC_TIMESTAMP()'
    )->execute([$userId, $profile['target_language'], $profile['level']]);
}

function try_match(PDO $db, int $userId, array $profile): ?array
{
    $stmt = $db->prepare(
        'SELECT user_id FROM call_queue
         WHERE target_language = ? AND level = ? AND user_id <> ?
           AND joined_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 SECOND)
         ORDER BY joined_at LIMIT 1 FOR UPDATE'
    );
    $stmt->execute([$profile['target_language'], $profile['level'], $userId]);
    $partnerId = $stmt->fetchColumn();
    if (!$partnerId) {
        return null;
    }
    $partnerId = (int) $partnerId;
    $partner = profile_row($partnerId);
    $mine = profile_row($userId);
    if (!$partner || !$mine) {
        return null;
    }
    $seconds = min(
        plan_limits(active_plan_from_row($mine))['callSeconds'],
        plan_limits(active_plan_from_row($partner))['callSeconds']
    );

    $db->prepare('DELETE FROM call_queue WHERE user_id IN (?, ?)')->execute([$userId, $partnerId]);
    $db->prepare(
        'INSERT INTO calls (target_language, level, user_a, user_b, ends_at)
         VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))'
    )->execute([$profile['target_language'], $profile['level'], $userId, $partnerId, $seconds]);

    $callId = (int) $db->lastInsertId();
    $loaded = $db->prepare('SELECT * FROM calls WHERE id = ?');
    $loaded->execute([$callId]);
    $row = $loaded->fetch();
    return $row ?: null;
}

/**
 * Join the queue or refresh a search/call.
 * $enqueue puts the learner in the queue. Polling ($enqueue false) only stays
 * there if they already joined, and refreshes the heartbeat so they can be matched.
 */
function call_sync(int $userId, int $afterId, bool $enqueue, int $watchId): array
{
    $profile = profile_row($userId);
    if (!$profile) {
        throw new ApiError(422, 'no_profile', 'Finish setup before starting a call.');
    }

    purge_old_call_files();
    $db = db();
    $db->beginTransaction();
    try {
        expire_due_calls($db);
        $live = lock_live_call($db, $userId);
        if ($live) {
            $db->commit();
            return call_payload('matched', $live, $userId, $afterId);
        }

        $queued = $db->prepare('SELECT user_id FROM call_queue WHERE user_id = ? FOR UPDATE');
        $queued->execute([$userId]);
        $inQueue = (bool) $queued->fetchColumn();
        if ($enqueue || $inQueue) {
            upsert_queue($db, $userId, $profile);
            $matched = try_match($db, $userId, $profile);
            $db->commit();
            if ($matched) {
                return call_payload('matched', $matched, $userId, $afterId);
            }
            return call_payload('waiting', null, $userId, $afterId);
        }

        if ($watchId > 0) {
            $watched = lock_call_for_user($db, $watchId, $userId);
            if ($watched && $watched['ended_at'] !== null) {
                $db->commit();
                return call_payload('ended', $watched, $userId, $afterId);
            }
        }

        $db->commit();
        return call_payload('idle', null, $userId, $afterId);
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

function leave_call(int $userId): void
{
    $db = db();
    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM call_queue WHERE user_id = ?')->execute([$userId]);
        $live = lock_live_call($db, $userId);
        if ($live) {
            $db->prepare('UPDATE calls SET ended_at = UTC_TIMESTAMP() WHERE id = ?')->execute([(int) $live['id']]);
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

function save_call_clip(int $userId): array
{
    $db = db();
    $db->beginTransaction();
    try {
        expire_due_calls($db);
        $live = lock_live_call($db, $userId);
        if (!$live) {
            throw new ApiError(409, 'call_ended', 'The call has ended.');
        }
        $callId = (int) $live['id'];
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }

    $file = $_FILES['audio'] ?? null;
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new ApiError(422, 'upload_failed', 'The recording could not be uploaded.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new ApiError(422, 'upload_failed', 'The recording could not be uploaded.');
    }
    if ($file['size'] > (int) (config()['max_audio_bytes'] ?? 5242880)) {
        throw new ApiError(413, 'audio_too_large', 'The recording is too long.');
    }
    $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, CALL_AUDIO_EXTENSIONS, true)) {
        throw new ApiError(422, 'audio_format', 'Unsupported recording format.');
    }

    $name = bin2hex(random_bytes(16)) . '.' . $extension;
    if (!move_uploaded_file($file['tmp_name'], call_dir() . '/' . $name)) {
        throw new ApiError(500, 'server_error', 'Could not store the recording.');
    }

    db()->prepare('INSERT INTO call_clips (call_id, user_id, filename) VALUES (?, ?, ?)')
        ->execute([$callId, $userId, $name]);

    return ['id' => (int) db()->lastInsertId()];
}
