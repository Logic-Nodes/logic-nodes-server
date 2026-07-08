import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "logicnodes",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  },
  iot: {
    // A device is considered disconnected when no telemetry/heartbeat arrives
    // within this window; the monitor then flips it offline and raises an alert.
    offlineAfterSeconds: Number(process.env.IOT_OFFLINE_AFTER_SECONDS || 90),
    monitorIntervalSeconds: Number(process.env.IOT_MONITOR_INTERVAL_SECONDS || 30),
    // Fallback thresholds used when the trip's delivery orders do not define any.
    defaultThresholds: {
      minTemperature: numberOrNull(process.env.IOT_MIN_TEMPERATURE, 2),
      maxTemperature: numberOrNull(process.env.IOT_MAX_TEMPERATURE, 8),
      minHumidity: numberOrNull(process.env.IOT_MIN_HUMIDITY, 20),
      maxHumidity: numberOrNull(process.env.IOT_MAX_HUMIDITY, 85),
      maxVibration: numberOrNull(process.env.IOT_MAX_VIBRATION, 5)
    }
  }
};

function numberOrNull(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
