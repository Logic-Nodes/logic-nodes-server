import mqtt from "mqtt";

import { createTelemetryData } from "../../../contexts/monitoring/application/monitoring-service.js";
import { query } from "../db/postgres.js";

const parsePayload = (raw) => {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
};

export const startMqttSubscriber = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.log("MQTT subscriber disabled (MQTT_BROKER_URL not set)");
    return;
  }

  const topic = process.env.MQTT_TELEMETRY_TOPIC || "omnitrack/telemetry/#";
  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  });

  client.on("connect", () => {
    client.subscribe(topic);
    console.log(`MQTT connected — subscribed to ${topic}`);
  });

  client.on("message", async (_topic, payload) => {
    const message = parsePayload(payload);
    if (!message?.imei) {
      return;
    }

    const sessions = await query(
      `
        SELECT ms.id
        FROM monitoring_sessions ms
        JOIN devices d ON d.id = ms.device_id
        WHERE d.imei = $1 AND ms.status = 'ACTIVE'
        ORDER BY ms.id DESC
        LIMIT 1
      `,
      [message.imei]
    );
    if (sessions.length === 0) {
      return;
    }

    await createTelemetryData({
      monitoringSessionId: sessions[0].id,
      temperature: message.temperature,
      humidity: message.humidity,
      vibration: message.vibration,
      latitude: message.latitude,
      longitude: message.longitude
    });
  });

  client.on("error", (error) => {
    console.error("[mqtt] error:", error.message);
  });
};
