-- Run once in Hostinger phpMyAdmin (or `mysql < api/schema.sql`) on an empty database.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY auth_tokens_hash_unique (token_hash),
  KEY auth_tokens_user (user_id),
  CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kept separate from users so calls can read learning languages
-- without touching credentials.
CREATE TABLE IF NOT EXISTS profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  native_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  target_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  level VARCHAR(8) NOT NULL DEFAULT 'A1',
  plan ENUM('free', 'day', 'week', 'month', 'year') NOT NULL DEFAULT 'free',
  plan_expires_at DATETIME NULL,
  google_product_id VARCHAR(64) NULL,
  google_purchase_token TEXT NULL,
  google_token_hash CHAR(64) NULL,
  streak_count INT UNSIGNED NOT NULL DEFAULT 0,
  streak_last_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY profiles_google_token (google_token_hash),
  CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id BIGINT UNSIGNED NOT NULL,
  language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, language, lesson_id),
  CONSTRAINT lesson_progress_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id BIGINT UNSIGNED NOT NULL,
  day DATE NOT NULL,
  requests INT UNSIGNED NOT NULL DEFAULT 0,
  bonus INT UNSIGNED NOT NULL DEFAULT 0,
  rewards TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  CONSTRAINT ai_usage_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Learners waiting for a voice partner at the same target language and level.
CREATE TABLE IF NOT EXISTS call_queue (
  user_id BIGINT UNSIGNED NOT NULL,
  target_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  level VARCHAR(8) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY call_queue_match (target_language, level, joined_at),
  CONSTRAINT call_queue_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  level VARCHAR(8) NOT NULL,
  user_a BIGINT UNSIGNED NOT NULL,
  user_b BIGINT UNSIGNED NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY calls_user_a (user_a, ended_at),
  KEY calls_user_b (user_b, ended_at),
  CONSTRAINT calls_user_a_fk FOREIGN KEY (user_a) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT calls_user_b_fk FOREIGN KEY (user_b) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS call_clips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  call_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  filename VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY call_clips_call (call_id, id),
  CONSTRAINT call_clips_call_fk FOREIGN KEY (call_id) REFERENCES calls (id) ON DELETE CASCADE,
  CONSTRAINT call_clips_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
