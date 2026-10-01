<?php
// Copy to config.php on the server and fill in real values. Never commit config.php.

return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u000000000_languages',
        'user' => 'u000000000_languages',
        'password' => 'change-me',
    ],

    'openai' => [
        'api_key' => 'sk-change-me',
        'base_url' => 'https://api.openai.com/v1',
        'transcribe_model' => 'gpt-4o-mini-transcribe',
        'chat_model' => 'gpt-4o-mini',
        'tts_model' => 'gpt-4o-mini-tts',
        'tts_voice' => 'alloy',
    ],

    // Days a sign-in token stays valid.
    'token_days' => 60,

    // Tutor requests allowed per user per day; protects your OpenAI bill.
    'ai_daily_limit' => 200,

    // Largest accepted recording upload, in bytes.
    'max_audio_bytes' => 5 * 1024 * 1024,

    // Only needed when testing the Expo web build against this API.
    'cors_origin' => '*',
];
