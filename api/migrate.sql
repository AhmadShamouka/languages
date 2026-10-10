-- Run once in phpMyAdmin if this database was created from an older schema.sql.
-- A brand-new database only needs schema.sql.

SET NAMES utf8mb4;

ALTER TABLE profiles
  MODIFY native_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  MODIFY target_language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL,
  ADD COLUMN plan ENUM('free', 'day', 'month') NOT NULL DEFAULT 'free',
  ADD COLUMN plan_expires_at DATETIME NULL;

ALTER TABLE lesson_progress
  MODIFY language ENUM('de', 'en', 'fr', 'ar', 'it') NOT NULL;

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
