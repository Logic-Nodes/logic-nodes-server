import { env } from "../../../shared/config/env.js";
import { httpError } from "../../../shared/application/http-error.js";
import {
  touchDeviceOnline,
  verifyDeviceCredentials
} from "../../fleet/application/fleet-service.js";
import {
  createSession,
  createTelemetryData,
  getActiveSessionByDevice
} from "../../monitoring/application/monitoring-service.js";
import { listDeliveryOrdersByTrip } from "../../trip/application/trip-service.js";
import { findOpenAlert, raiseAlert } from "../../alerts/application/alert-service.js";

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Reads either the flat body fields or a nested { readings: {...} } object so
// the firmware can send whichever is more convenient.
const extractReading = (payload) => {
  const source = payload.readings && typeof payload.readings === "object" ? payload.readings : payload;
  return {
    temperature: toNumberOrNull(source.temperature),
    humidity: toNumberOrNull(source.humidity),
    vibration: toNumberOrNull(source.vibration),
    latitude: toNumberOrNull(source.latitude),
    longitude: toNumberOrNull(source.longitude)
  };
};

// Picks the delivery order thresholds to evaluate against, falling back to the
// configured defaults so a demo always produces alerts on out-of-range values.
const resolveThresholds = (orders) => {
  const order = orders.find((o) => o.status === "PENDING") || orders[0] || null;
  const defaults = env.iot.defaultThresholds;

  const pick = (value, fallback) => (value == null ? fallback : value);

  return {
    deliveryOrderId: order ? order.id : null,
    minTemperature: pick(order?.minTemperature, defaults.minTemperature),
    maxTemperature: pick(order?.maxTemperature, defaults.maxTemperature),
    minHumidity: pick(order?.minHumidity, defaults.minHumidity),
    maxHumidity: pick(order?.maxHumidity, defaults.maxHumidity),
    maxVibration: pick(order?.maxVibration, defaults.maxVibration)
  };
};

const buildViolations = (reading, thresholds) => {
  const violations = [];

  const { temperature, humidity, vibration } = reading;

  if (temperature != null) {
    if (thresholds.maxTemperature != null && temperature > thresholds.maxTemperature) {
      violations.push({ alertType: "TEMPERATURE", description: `Temperature ${temperature}\u00b0C above max ${thresholds.maxTemperature}\u00b0C` });
    } else if (thresholds.minTemperature != null && temperature < thresholds.minTemperature) {
      violations.push({ alertType: "TEMPERATURE", description: `Temperature ${temperature}\u00b0C below min ${thresholds.minTemperature}\u00b0C` });
    }
  }

  if (humidity != null) {
    if (thresholds.maxHumidity != null && humidity > thresholds.maxHumidity) {
      violations.push({ alertType: "HUMIDITY", description: `Humidity ${humidity}% above max ${thresholds.maxHumidity}%` });
    } else if (thresholds.minHumidity != null && humidity < thresholds.minHumidity) {
      violations.push({ alertType: "HUMIDITY", description: `Humidity ${humidity}% below min ${thresholds.minHumidity}%` });
    }
  }

  if (vibration != null && thresholds.maxVibration != null && vibration > thresholds.maxVibration) {
    violations.push({ alertType: "VIBRATION", description: `Vibration ${vibration} above max ${thresholds.maxVibration}` });
  }

  return violations;
};

// Threshold engine (B-12 / B-26): turns out-of-range telemetry into alerts,
// deduplicating while the same condition stays open.
export const evaluateReadingAgainstThresholds = async (session, reading) => {
  const orders = await listDeliveryOrdersByTrip(session.tripId).catch(() => []);
  const thresholds = resolveThresholds(orders);
  const violations = buildViolations(reading, thresholds);

  const raised = [];
  for (const violation of violations) {
    const existing = await findOpenAlert(thresholds.deliveryOrderId, violation.alertType);
    if (existing) {
      continue;
    }
    const alert = await raiseAlert({
      deliveryOrderId: thresholds.deliveryOrderId,
      alertType: violation.alertType,
      description: violation.description
    });
    raised.push(alert);
  }

  return raised;
};

/**
 * Ingests a single telemetry sample from an authenticated IoT device.
 * Auth: the device sends its IMEI + secret (verified against the devices table).
 */
export const ingestTelemetry = async ({ imei, deviceSecret, tripId = null, recordedAt = null, ...payload } = {}) => {
  if (!imei) {
    throw httpError("imei is required", 400);
  }

  const device = await verifyDeviceCredentials(imei, deviceSecret);
  await touchDeviceOnline(imei);

  let session = await getActiveSessionByDevice(imei);
  if (!session) {
    if (!tripId) {
      throw httpError(
        "No active monitoring session for this device. Provide tripId to open one or start a session first.",
        409
      );
    }
    session = await createSession({ deviceId: imei, tripId, startTime: new Date(), status: "ACTIVE" });
  }

  const reading = extractReading(payload);

  const telemetry = await createTelemetryData({
    monitoringSessionId: session.id,
    temperature: reading.temperature,
    humidity: reading.humidity,
    vibration: reading.vibration,
    latitude: reading.latitude,
    longitude: reading.longitude,
    createdAt: recordedAt || new Date()
  });

  const alerts = await evaluateReadingAgainstThresholds(session, reading);

  return {
    deviceOnline: true,
    deviceId: device.id,
    sessionId: session.id,
    tripId: session.tripId,
    telemetry,
    alerts
  };
};

// Lightweight liveness ping without telemetry (keeps the device "online").
export const heartbeat = async ({ imei, deviceSecret } = {}) => {
  if (!imei) {
    throw httpError("imei is required", 400);
  }
  await verifyDeviceCredentials(imei, deviceSecret);
  const device = await touchDeviceOnline(imei);
  return { deviceOnline: true, imei, lastSeenAt: device?.lastSeenAt || null };
};
