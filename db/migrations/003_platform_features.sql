-- Trips tracking, push tokens, disconnect-alert metadata.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_tracking_code
  ON trips(tracking_code)
  WHERE tracking_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS device_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

CREATE TABLE IF NOT EXISTS iot_disconnect_events (
  id BIGSERIAL PRIMARY KEY,
  device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iot_disconnect_open_device
  ON iot_disconnect_events(device_id)
  WHERE resolved_at IS NULL;
