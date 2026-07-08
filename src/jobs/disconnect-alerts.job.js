import { query } from "../../../shared/infrastructure/db/postgres.js";
import { createAlert } from "../../../contexts/alerts/application/alert-service.js";

const DISCONNECT_MINUTES = Number(process.env.IOT_DISCONNECT_MINUTES || 15);

export const runDisconnectAlertsJob = async () => {
  const staleDevices = await query(
    `
      SELECT d.id,
             d.imei,
             d.online,
             d.vehicle_plate AS "vehiclePlate",
             MAX(td.created_at) AS "lastTelemetryAt"
      FROM devices d
      LEFT JOIN monitoring_sessions ms ON ms.device_id = d.id
      LEFT JOIN telemetry_data td ON td.monitoring_session_id = ms.id
      GROUP BY d.id
      HAVING d.online = false
          OR MAX(td.created_at) IS NULL
          OR MAX(td.created_at) < NOW() - ($1 || ' minutes')::interval
    `,
    [String(DISCONNECT_MINUTES)]
  );

  for (const device of staleDevices) {
    const openEvent = await query(
      `
        SELECT id FROM iot_disconnect_events
        WHERE device_id = $1 AND resolved_at IS NULL
        LIMIT 1
      `,
      [device.id]
    );
    if (openEvent.length > 0) {
      continue;
    }

    const alert = await createAlert({
      alertType: "OTHER",
      alertStatus: "OPEN"
    });

    await query(
      `
        INSERT INTO iot_disconnect_events (device_id, alert_id)
        VALUES ($1, $2)
      `,
      [device.id, alert.id]
    );

    console.log(`[job:disconnect] alert ${alert.id} for device ${device.imei}`);
  }
};

export const resolveDisconnectAlertsForOnlineDevices = async () => {
  await query(
    `
      UPDATE iot_disconnect_events e
      SET resolved_at = NOW()
      FROM devices d
      WHERE e.device_id = d.id
        AND e.resolved_at IS NULL
        AND d.online = true
    `
  );
};
