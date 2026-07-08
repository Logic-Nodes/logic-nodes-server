-- IoT ingestion + rescheduling + public tracking schema additions.
-- Run against the same database as schema.sql:
--   psql -U postgres -d logicnodes -f db/iot.sql
-- Idempotent: safe to run multiple times (including on the Render production DB).

-- 1. Per-device credentials + liveness tracking (used by the ESP32 HTTP ingest).
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_secret VARCHAR(80);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- 2. Trip rescheduling (US026) + public tracking code (US027).
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(24);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_tracking_code ON trips(tracking_code);

-- Backfill tracking codes for trips created before this migration.
UPDATE trips
SET tracking_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10))
WHERE tracking_code IS NULL;

-- 3. Automatic IoT disconnection alerts (US030) need a new alert type value.
--    ALTER TYPE ... ADD VALUE cannot run inside a transaction, keep it standalone.
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'DISCONNECTION';

-- 4. Helpful indexes for the ingest + disconnection worker.
CREATE INDEX IF NOT EXISTS idx_devices_online ON devices(online);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen_at ON devices(last_seen_at);
