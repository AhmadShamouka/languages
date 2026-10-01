<?php

declare(strict_types=1);

final class OpenAiError extends RuntimeException
{
}

/**
 * @param array|null $json JSON body; mutually exclusive with $form.
 * @param array|null $form multipart fields (CURLFile values allowed).
 * @return string raw response body
 */
function openai_call(string $path, ?array $json = null, ?array $form = null, int $timeout = 60): string
{
    $openai = config()['openai'];
    $key = $openai['api_key'] ?? '';
    if ($key === '' || str_contains($key, 'change-me')) {
        throw new ApiError(503, 'ai_not_configured', 'The AI tutor is not configured on the server yet.');
    }

    $headers = ['Authorization: Bearer ' . $key];
    $baseUrl = rtrim($openai['base_url'] ?? 'https://api.openai.com/v1', '/');
    $ch = curl_init("$baseUrl/$path");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    if ($json !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json, JSON_UNESCAPED_UNICODE));
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $form ?? []);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new OpenAiError("OpenAI request failed: $curlError");
    }
    if ($status < 200 || $status >= 300) {
        throw new OpenAiError("OpenAI $path returned $status: " . substr((string) $body, 0, 500));
    }
    return (string) $body;
}

function openai_transcribe(string $filePath, string $fileName, string $mimeType, string $language): string
{
    $body = openai_call('audio/transcriptions', form: [
        'file' => new CURLFile($filePath, $mimeType, $fileName),
        'model' => config()['openai']['transcribe_model'],
        'language' => $language,
        'response_format' => 'json',
    ]);
    $data = json_decode($body, true);
    return trim((string) ($data['text'] ?? ''));
}

/** Chat completion constrained to a JSON object reply. */
function openai_json_chat(array $messages, float $temperature = 0.4): array
{
    $body = openai_call('chat/completions', json: [
        'model' => config()['openai']['chat_model'],
        'messages' => $messages,
        'temperature' => $temperature,
        'response_format' => ['type' => 'json_object'],
    ]);
    $data = json_decode($body, true);
    $content = $data['choices'][0]['message']['content'] ?? '';
    $parsed = json_decode((string) $content, true);
    if (!is_array($parsed)) {
        throw new OpenAiError('OpenAI chat returned non-JSON content.');
    }
    return $parsed;
}

/** @return string base64-encoded MP3 */
function openai_speech(string $text, string $instructions): string
{
    $openai = config()['openai'];
    $audio = openai_call('audio/speech', json: [
        'model' => $openai['tts_model'],
        'voice' => $openai['tts_voice'] ?? 'alloy',
        'input' => $text,
        'instructions' => $instructions,
        'response_format' => 'mp3',
    ]);
    return base64_encode($audio);
}
