<?php

declare(strict_types=1);

final class AiError extends RuntimeException
{
}

/** @return array{transcribe_model: string, chat_model: string, tts_model: string, tts_voice: string} */
function gemini_models(bool $paid): array
{
    $gemini = config()['gemini'] ?? [];
    $tier = $paid ? ($gemini['paid'] ?? []) : ($gemini['free'] ?? []);
    $defaults = $paid
        ? [
            'transcribe_model' => 'gemini-3.5-transcribe',
            'chat_model' => 'gemini-3.1-pro-preview',
            'tts_model' => 'gemini-3.8-flash-tts',
            'tts_voice' => 'Kore',
        ]
        : [
            'transcribe_model' => 'gemini-3.5-transcribe',
            'chat_model' => 'gemini-3.5-flash-lite',
            'tts_model' => 'gemini-2.5-flash-preview-tts',
            'tts_voice' => 'Kore',
        ];

    return [
        'transcribe_model' => (string) ($tier['transcribe_model'] ?? $defaults['transcribe_model']),
        'chat_model' => (string) ($tier['chat_model'] ?? $defaults['chat_model']),
        'tts_model' => (string) ($tier['tts_model'] ?? $defaults['tts_model']),
        'tts_voice' => (string) ($tier['tts_voice'] ?? $defaults['tts_voice']),
    ];
}

function gemini_key(): string
{
    $key = (string) (config()['gemini']['api_key'] ?? '');
    if ($key === '' || str_contains($key, 'change-me')) {
        throw new ApiError(503, 'ai_not_configured', 'The AI tutor is not configured on the server yet.');
    }
    return $key;
}

/** @param array<string, mixed> $body */
function gemini_generate(string $model, array $body): array
{
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . gemini_key(),
        ],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new AiError("Gemini request failed: $curlError");
    }
    $data = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300 || !is_array($data)) {
        $message = is_array($data) ? (string) ($data['error']['message'] ?? '') : '';
        throw new AiError("Gemini $model returned $status: " . substr($message !== '' ? $message : (string) $raw, 0, 500));
    }
    return $data;
}

/**
 * Paid models have no free quota. If Google rejects one, use the free model
 * so a subscriber can still practice before billing is turned on.
 *
 * @param array<string, mixed> $body
 */
function gemini_call(string $model, array $body, string $job): array
{
    try {
        return gemini_generate($model, $body);
    } catch (AiError $e) {
        $fallback = gemini_models(false)[$job] ?? '';
        $blocked = str_contains($e->getMessage(), 'returned 429') || str_contains($e->getMessage(), 'quota');
        if ($fallback === '' || $fallback === $model || !$blocked) {
            throw $e;
        }
        error_log("Gemini $model is not available on this key, using $fallback");
        return gemini_generate($fallback, $body);
    }
}

function gemini_text(array $data): string
{
    $parts = $data['candidates'][0]['content']['parts'] ?? [];
    $text = '';
    foreach ($parts as $part) {
        if (isset($part['text']) && is_string($part['text'])) {
            $text .= $part['text'];
        }
    }
    return trim($text);
}

/** @param array{transcribe_model: string, chat_model: string, tts_model: string, tts_voice: string} $models */
function gemini_transcribe(string $filePath, string $mimeType, string $language, array $models): string
{
    $audio = base64_encode((string) file_get_contents($filePath));
    $data = gemini_call($models['transcribe_model'], [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['text' => "Transcribe the speech. The speaker is practicing language code $language. Return only the words you heard."],
                ['inlineData' => ['mimeType' => $mimeType, 'data' => $audio]],
            ],
        ]],
    ], 'transcribe_model');
    $text = gemini_text($data);
    if ($text !== '') {
        return $text;
    }

    $heard = '';
    foreach ($data['candidates'][0]['content']['parts'] ?? [] as $part) {
        $chunk = $part['audioTranscription']['text'] ?? $part['audio_transcription']['text'] ?? null;
        if (is_string($chunk)) {
            $heard .= $chunk;
        }
    }
    return trim($heard);
}

/**
 * @param list<array{role: string, content: string}> $messages
 * @param array{transcribe_model: string, chat_model: string, tts_model: string, tts_voice: string} $models
 */
function gemini_json_chat(array $messages, float $temperature, array $models): array
{
    $system = [];
    $contents = [];
    foreach ($messages as $message) {
        if ($message['role'] === 'system') {
            $system[] = ['text' => $message['content']];
            continue;
        }
        $contents[] = [
            'role' => $message['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $message['content']]],
        ];
    }
    if ($contents === []) {
        throw new AiError('Gemini chat had no user message.');
    }

    $body = [
        'contents' => $contents,
        'generationConfig' => [
            'temperature' => $temperature,
            'responseMimeType' => 'application/json',
        ],
    ];
    if ($system !== []) {
        $body['systemInstruction'] = ['parts' => $system];
    }

    $parsed = json_decode(gemini_text(gemini_call($models['chat_model'], $body, 'chat_model')), true);
    if (!is_array($parsed)) {
        throw new AiError('Gemini chat returned non-JSON content.');
    }
    return $parsed;
}

/** @param array{transcribe_model: string, chat_model: string, tts_model: string, tts_voice: string} $models */
function gemini_speech(string $text, array $models): string
{
    $data = gemini_call($models['tts_model'], [
        'contents' => [[
            'role' => 'user',
            'parts' => [['text' => $text]],
        ]],
        'generationConfig' => [
            'responseModalities' => ['AUDIO'],
            'speechConfig' => [
                'voiceConfig' => [
                    'prebuiltVoiceConfig' => ['voiceName' => $models['tts_voice']],
                ],
            ],
        ],
    ], 'tts_model');

    foreach ($data['candidates'][0]['content']['parts'] ?? [] as $part) {
        $inline = $part['inlineData'] ?? $part['inline_data'] ?? null;
        if (!is_array($inline) || !is_string($inline['data'] ?? null)) {
            continue;
        }
        $raw = base64_decode($inline['data'], true);
        if ($raw === false || $raw === '') {
            continue;
        }
        $mime = strtolower((string) ($inline['mimeType'] ?? $inline['mime_type'] ?? ''));
        if (!str_starts_with($raw, 'RIFF') && !str_contains($mime, 'wav')) {
            $raw = wav_from_pcm($raw);
        }
        return base64_encode($raw);
    }

    throw new AiError('Gemini speech returned no audio.');
}

function wav_from_pcm(string $pcm, int $sampleRate = 24000): string
{
    $channels = 1;
    $bits = 16;
    $blockAlign = $channels * intdiv($bits, 8);
    $byteRate = $sampleRate * $blockAlign;
    $dataLength = strlen($pcm);

    return 'RIFF'
        . pack('V', 36 + $dataLength)
        . 'WAVE'
        . 'fmt '
        . pack('VvvVVvv', 16, 1, $channels, $sampleRate, $byteRate, $blockAlign, $bits)
        . 'data'
        . pack('V', $dataLength)
        . $pcm;
}
