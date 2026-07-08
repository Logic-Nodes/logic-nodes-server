-- LogicNodesBD PostgreSQL schema generated from Java domain model
-- Run: psql -U postgres -d logicnodes -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE alert_type_enum AS ENUM ('TEMPERATURE', 'HUMIDITY', 'VIBRATION', 'GEOFENCE', 'DELAY', 'DISCONNECTION', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status_enum AS ENUM ('OPEN', 'ACKNOWLEDGED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel_enum AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WEBHOOK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type_enum AS ENUM ('TRUCK', 'VAN', 'MOTORCYCLE', 'CAR', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status_enum AS ENUM ('AVAILABLE', 'IN_TRIP', 'MAINTENANCE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE monitoring_status_enum AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_order_status_enum AS ENUM ('PENDING', 'DELIVERED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('DNI', 'PASSPORT', 'RUC', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id BIGSERIAL PRIMARY KEY,
  jti_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS merchants (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  fiscal_address VARCHAR(500) NOT NULL,
  ruc VARCHAR(32) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(150) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  birth_date DATE,
  phone_number VARCHAR(30),
  document_type document_type_enum,
  document VARCHAR(50),
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGSERIAL PRIMARY KEY,
  imei VARCHAR(32) NOT NULL UNIQUE,
  firmware VARCHAR(50) NOT NULL,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  vehicle_plate VARCHAR(32),
  device_secret VARCHAR(80),
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  plate VARCHAR(32) NOT NULL UNIQUE,
  type vehicle_type_enum NOT NULL,
  status vehicle_status_enum NOT NULL,
  odometer_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_capabilities (
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  capability VARCHAR(80) NOT NULL,
  PRIMARY KEY (vehicle_id, capability)
);

CREATE TABLE IF NOT EXISTS vehicle_device_imeis (
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  device_imei VARCHAR(32) NOT NULL,
  PRIMARY KEY (vehicle_id, device_imei)
);

CREATE TABLE IF NOT EXISTS origin_points (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  merchant_id BIGINT NOT NULL REFERENCES merchants(id),
  driver_id BIGINT NOT NULL REFERENCES users(id),
  device_id BIGINT REFERENCES devices(id),
  vehicle_id BIGINT REFERENCES vehicles(id),
  origin_point_id BIGINT REFERENCES origin_points(id),
  status trip_status_enum NOT NULL,
  tracking_code VARCHAR(24) UNIQUE,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  client_email VARCHAR(255) NOT NULL,
  sequence_order BIGINT NOT NULL,
  arrival_at TIMESTAMP,
  order_thresholds JSONB,
  location JSONB,
  status delivery_order_status_enum NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  delivery_order_id BIGINT REFERENCES delivery_orders(id),
  alert_type alert_type_enum NOT NULL,
  alert_status alert_status_enum NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  closed_at TIMESTAMP,
  inserted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  notification_channel notification_channel_enum,
  message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_sessions (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  trip_id VARCHAR(64) NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status monitoring_status_enum NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry_data (
  id BIGSERIAL PRIMARY KEY,
  monitoring_session_id BIGINT NOT NULL REFERENCES monitoring_sessions(id) ON DELETE CASCADE,
  temperature REAL,
  humidity REAL,
  vibration REAL,
  latitude REAL,
  longitude REAL,
  created_at TIMESTAMP,
  inserted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_trip_id ON monitoring_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON telemetry_data(monitoring_session_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_trip_id ON delivery_orders(trip_id);
