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

    // Free plans use the free models. Day and month plans use the paid models,
    // so the Gemini key needs billing turned on before those plans can speak.
    'gemini' => [
        'api_key' => 'change-me',
        'free' => [
            'transcribe_model' => 'gemini-3.5-transcribe',
            'chat_model' => 'gemini-3.5-flash-lite',
            'tts_model' => 'gemini-2.5-flash-preview-tts',
            'tts_voice' => 'Kore',
        ],
        'paid' => [
            'transcribe_model' => 'gemini-3.5-transcribe',
            'chat_model' => 'gemini-3.1-pro-preview',
            'tts_model' => 'gemini-3.8-flash-tts',
            'tts_voice' => 'Kore',
        ],
    ],

    // Days a sign-in token stays valid.
    'token_days' => 60,

    // Tutor requests allowed per user per day. Paid plans allow 40 and are also capped by this.
    'ai_daily_limit' => 40,

    // Google Play package and the service-account JSON used to confirm a purchase.
    // Create the JSON in Play Console → Setup → API access. Never commit the file.
    'play' => [
        'package_name' => 'com.aloro.app',
        'service_account_json' => __DIR__ . '/play-service-account.json',
    ],

    // Largest accepted recording upload, in bytes.
    'max_audio_bytes' => 5 * 1024 * 1024,

    // Only needed when testing the Expo web build against this API.
    'cors_origin' => '*',
];
