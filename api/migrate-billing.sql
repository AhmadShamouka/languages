-- Run once on a database that already has the original tables. Do not run api/migrate.sql again.

ALTER TABLE profiles
  MODIFY plan ENUM('free', 'day', 'week', 'month', 'year') NOT NULL DEFAULT 'free',
  ADD COLUMN google_product_id VARCHAR(64) NULL AFTER plan_expires_at,
  ADD COLUMN google_purchase_token TEXT NULL AFTER google_product_id,
  ADD COLUMN google_token_hash CHAR(64) NULL AFTER google_purchase_token,
  ADD UNIQUE KEY profiles_google_token (google_token_hash);

ALTER TABLE ai_usage
  ADD COLUMN bonus INT UNSIGNED NOT NULL DEFAULT 0 AFTER requests,
  ADD COLUMN rewards TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER bonus;
