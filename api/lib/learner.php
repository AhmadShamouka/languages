<?php

declare(strict_types=1);

/** Free practice is short. Paid plans remove ads. Each paid plan allows 40 speaking checks a day. */
function plan_limits(string $plan): array
{
    $catalog = [
        'free' => ['ai' => 15, 'callSeconds' => 180, 'ads' => true],
        'day' => ['ai' => 40, 'callSeconds' => 900, 'ads' => false],
        'week' => ['ai' => 40, 'callSeconds' => 900, 'ads' => false],
        'month' => ['ai' => 40, 'callSeconds' => 1800, 'ads' => false],
        'year' => ['ai' => 40, 'callSeconds' => 1800, 'ads' => false],
    ];
    $limits = $catalog[$plan] ?? $catalog['free'];
    $cap = (int) (config()['ai_daily_limit'] ?? 200);
    $limits['ai'] = min($limits['ai'], max(1, $cap));
    return $limits;
}

function profile_row(int $userId): ?array
{
    $stmt = db()->prepare('SELECT * FROM profiles WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function active_plan_from_row(array $row): string
{
    $plan = $row['plan'] ?? 'free';
    $expiresAt = $row['plan_expires_at'] ?? null;
    if ($plan === 'free' || $expiresAt === null || $expiresAt === '') {
        return 'free';
    }
    $expires = new DateTimeImmutable((string) $expiresAt, new DateTimeZone('UTC'));
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    return $expires > $now ? $plan : 'free';
}

function active_plan(int $userId): string
{
    $row = profile_row($userId);
    return $row ? active_plan_from_row($row) : 'free';
}

function profile_payload(array $row): array
{
    $plan = active_plan_from_row($row);
    $limits = plan_limits($plan);
    return [
        'nativeLanguage' => $row['native_language'],
        'targetLanguage' => $row['target_language'],
        'level' => $row['level'],
        'plan' => $plan,
        'planExpiresAt' => $plan === 'free' ? null : $row['plan_expires_at'],
        'ads' => $limits['ads'],
        'callSeconds' => $limits['callSeconds'],
        'streak' => [
            'count' => (int) $row['streak_count'],
            'lastDate' => $row['streak_last_date'],
        ],
    ];
}

function load_profile(int $userId): ?array
{
    $row = profile_row($userId);
    return $row ? profile_payload($row) : null;
}

function me_payload(array $user): array
{
    refresh_play_purchase((int) $user['id']);
    $stmt = db()->prepare('SELECT language, lesson_id FROM lesson_progress WHERE user_id = ? ORDER BY completed_at');
    $stmt->execute([$user['id']]);
    $completed = array_map(
        fn (array $row) => ['language' => $row['language'], 'lessonId' => $row['lesson_id']],
        $stmt->fetchAll()
    );
    return ['user' => $user, 'profile' => load_profile($user['id']), 'completedLessons' => $completed];
}

function save_profile(int $userId, array $input): array
{
    $native = language_field($input, 'nativeLanguage');
    $target = language_field($input, 'targetLanguage');
    if ($native === $target) {
        throw new ApiError(422, 'same_language', 'Pick a language to learn that is different from your own.');
    }
    $level = level_field($input, 'level');

    db()->prepare(
        'INSERT INTO profiles (user_id, native_language, target_language, level) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE native_language = VALUES(native_language),
           target_language = VALUES(target_language), level = VALUES(level)'
    )->execute([$userId, $native, $target, $level]);

    return load_profile($userId);
}

/**
 * Counts practice on the learner's local day: same day keeps the streak,
 * the next day extends it, and any gap restarts it at 1.
 */
function record_practice(int $userId, string $day): ?array
{
    $db = db();
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT streak_count, streak_last_date FROM profiles WHERE user_id = ? FOR UPDATE');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            $db->rollBack();
            return null;
        }

        $count = (int) $row['streak_count'];
        $last = $row['streak_last_date'];
        $yesterday = (new DateTimeImmutable($day, new DateTimeZone('UTC')))->modify('-1 day')->format('Y-m-d');

        if ($last !== null && $last >= $day) {
            // Already counted today, or the device clock moved backwards.
        } else {
            $count = $last === $yesterday ? $count + 1 : 1;
            $last = $day;
            $db->prepare('UPDATE profiles SET streak_count = ?, streak_last_date = ? WHERE user_id = ?')
                ->execute([$count, $last, $userId]);
        }

        $db->commit();
        return ['count' => $count, 'lastDate' => $last];
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

function complete_lesson(int $userId, array $input): array
{
    $language = language_field($input, 'language');
    $lessonId = str_field($input, 'lessonId', 64);
    if (!preg_match('/^[a-z0-9-]+$/', $lessonId)) {
        throw new ApiError(422, 'invalid_lesson', 'Invalid lesson id.');
    }
    $day = day_field($input);

    db()->prepare('INSERT IGNORE INTO lesson_progress (user_id, language, lesson_id) VALUES (?, ?, ?)')
        ->execute([$userId, $language, $lessonId]);

    return ['language' => $language, 'lessonId' => $lessonId, 'streak' => record_practice($userId, $day)];
}
