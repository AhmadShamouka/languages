<?php

declare(strict_types=1);

const LANGUAGE_NAMES = ['de' => 'German', 'en' => 'English', 'fr' => 'French'];
const AUDIO_EXTENSIONS = ['m4a', 'mp4', 'mp3', 'mpeg', 'mpga', 'wav', 'webm', 'ogg', 'flac', 'aac'];
const MAX_HISTORY_TURNS = 12;

function count_ai_request(int $userId): void
{
    $db = db();
    $db->prepare(
        'INSERT INTO ai_usage (user_id, day, requests) VALUES (?, UTC_DATE(), 1)
         ON DUPLICATE KEY UPDATE requests = requests + 1'
    )->execute([$userId]);
    $stmt = $db->prepare('SELECT requests FROM ai_usage WHERE user_id = ? AND day = UTC_DATE()');
    $stmt->execute([$userId]);
    $limit = (int) (config()['ai_daily_limit'] ?? 200);
    if ((int) $stmt->fetchColumn() > $limit) {
        throw new ApiError(429, 'daily_limit', 'You have reached today\'s speaking limit. Come back tomorrow!');
    }
}

/** Text the learner said: transcribed from the uploaded recording, or typed. */
function learner_utterance(array $input, string $language): string
{
    $file = $_FILES['audio'] ?? null;
    if ($file !== null && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            throw new ApiError(422, 'upload_failed', 'The recording could not be uploaded.');
        }
        if ($file['size'] > (int) (config()['max_audio_bytes'] ?? 5242880)) {
            throw new ApiError(413, 'audio_too_large', 'The recording is too long.');
        }
        $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, AUDIO_EXTENSIONS, true)) {
            throw new ApiError(422, 'audio_format', 'Unsupported recording format.');
        }
        $mime = is_string($file['type'] ?? null) && $file['type'] !== '' ? $file['type'] : 'application/octet-stream';
        return openai_transcribe($file['tmp_name'], "speech.$extension", $mime, $language);
    }
    return str_field($input, 'text', 500, false) ?? '';
}

function normalize_utterance(string $text): string
{
    $text = mb_strtolower($text);
    $text = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $text);
    return trim(preg_replace('/\s+/u', ' ', $text));
}

function check_utterance(string $transcript, string $expected, string $target, string $native, string $level): array
{
    if (normalize_utterance($transcript) === normalize_utterance($expected)) {
        return ['correct' => true, 'feedback' => null];
    }

    $targetName = LANGUAGE_NAMES[$target];
    $nativeName = LANGUAGE_NAMES[$native];
    $system = <<<PROMPT
You check spoken answers for a $level learner of $targetName.
Speech recognition drops punctuation and capitalisation and may mishear slightly; ignore that.
Mark it correct only if the learner said the expected words in $targetName. Wrong or missing words, or another language, are incorrect.
Reply as JSON: {"correct": boolean, "feedback": string}.
Write feedback in $nativeName, at most two short sentences. If incorrect, name the exact word(s) to fix. If correct, give brief encouragement.
PROMPT;
    $user = json_encode(['expected' => $expected, 'heard' => $transcript], JSON_UNESCAPED_UNICODE);

    $result = openai_json_chat([
        ['role' => 'system', 'content' => $system],
        ['role' => 'user', 'content' => $user],
    ], 0.2);

    return [
        'correct' => (bool) ($result['correct'] ?? false),
        'feedback' => is_string($result['feedback'] ?? null) ? $result['feedback'] : null,
    ];
}

function chat_turn(string $transcript, array $scenario, array $history, string $target, string $native, string $level): array
{
    $targetName = LANGUAGE_NAMES[$target];
    $nativeName = LANGUAGE_NAMES[$native];
    $topic = mb_substr(trim((string) ($scenario['topic'] ?? 'everyday conversation')), 0, 200);
    $goal = mb_substr(trim((string) ($scenario['goal'] ?? 'have a short conversation')), 0, 300);

    $system = <<<PROMPT
You are a friendly $targetName conversation partner for a $level learner whose native language is $nativeName.
Scenario: $topic
Learner's goal: $goal
Stay in this scenario and always reply in $targetName, even if the learner uses another language.
Use short, simple sentences suited to $level: at most two sentences, ending with a question or prompt that keeps the conversation going.
If the learner's last message has mistakes or is not in $targetName, give a short correction written in $nativeName that includes the corrected $targetName sentence. Otherwise correction is null.
Reply as JSON: {"reply": string in $targetName, "translation": the reply translated into $nativeName, "correction": string or null}.
PROMPT;

    $messages = [['role' => 'system', 'content' => $system]];
    foreach (array_slice($history, -MAX_HISTORY_TURNS) as $turn) {
        $role = $turn['role'] ?? null;
        $content = $turn['content'] ?? null;
        if (in_array($role, ['user', 'assistant'], true) && is_string($content) && $content !== '') {
            $messages[] = ['role' => $role, 'content' => mb_substr($content, 0, 1000)];
        }
    }
    $messages[] = ['role' => 'user', 'content' => $transcript];

    $result = openai_json_chat($messages, 0.7);
    $reply = trim((string) ($result['reply'] ?? ''));
    if ($reply === '') {
        throw new OpenAiError('OpenAI chat returned an empty reply.');
    }

    $audio = null;
    try {
        $audio = openai_speech($reply, "Speak clearly and a little slowly, like a patient $targetName teacher.");
    } catch (OpenAiError $e) {
        error_log('TTS failed: ' . $e->getMessage());
    }

    return [
        'reply' => $reply,
        'translation' => is_string($result['translation'] ?? null) ? $result['translation'] : null,
        'correction' => is_string($result['correction'] ?? null) && trim($result['correction']) !== '' ? $result['correction'] : null,
        'audioBase64' => $audio,
        'audioMimeType' => $audio !== null ? 'audio/mpeg' : null,
    ];
}

function tutor_request(array $user): array
{
    $input = read_input();
    $mode = str_field($input, 'mode', 10);
    if (!in_array($mode, ['check', 'chat'], true)) {
        throw new ApiError(422, 'invalid_mode', 'Mode must be check or chat.');
    }
    $target = language_field($input, 'targetLanguage');
    $native = language_field($input, 'nativeLanguage');
    $level = level_field($input, 'level');
    $day = day_field($input);

    count_ai_request($user['id']);

    $transcript = learner_utterance($input, $target);
    if ($transcript === '') {
        throw new ApiError(422, 'nothing_heard', 'We could not hear anything. Try again a little louder.');
    }

    if ($mode === 'check') {
        $expected = str_field($input, 'expected', 300);
        $result = check_utterance($transcript, $expected, $target, $native, $level);
    } else {
        $scenario = json_field($input, 'scenario') ?? [];
        $history = json_field($input, 'history') ?? [];
        $result = chat_turn($transcript, $scenario, $history, $target, $native, $level);
    }

    return ['transcript' => $transcript] + $result + ['streak' => record_practice($user['id'], $day)];
}
