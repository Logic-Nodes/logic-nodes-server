import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const createSession = async (payload = {}) => {
  const { deviceId, tripId, startTime = null, endTime = null, status = "ACTIVE" } = payload;
  if (!deviceId || !tripId) {
    throw httpError("deviceId and tripId are required", 400);
  }

  return single(
    `
      INSERT INTO monitoring_sessions (device_id, trip_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, device_id AS "deviceId", trip_id AS "tripId", start_time AS "startTime", end_time AS "endTime", created_at AS "createdAt", status
    `,
    [deviceId, tripId, startTime, endTime, status]
  );
};

export const getSession = async (sessionId) => single(
  `
    SELECT id, device_id AS "deviceId", trip_id AS "tripId", start_time AS "startTime", end_time AS "endTime", created_at AS "createdAt", status
    FROM monitoring_sessions
    WHERE id = $1
    LIMIT 1
  `,
  [sessionId]
);

export const listActiveSessions = async () => query(
  `
    SELECT id, device_id AS "deviceId", trip_id AS "tripId", start_time AS "startTime", end_time AS "endTime", created_at AS "createdAt", status
    FROM monitoring_sessions
    WHERE status = 'ACTIVE'
    ORDER BY id DESC
  `
);

export const listSessionsByTrip = async (tripId) => query(
  `
    SELECT id, device_id AS "deviceId", trip_id AS "tripId", start_time AS "startTime", end_time AS "endTime", created_at AS "createdAt", status
    FROM monitoring_sessions
    WHERE trip_id = $1
    ORDER BY id DESC
  `,
  [tripId]
);

export const deleteSession = async (sessionId) => query(`DELETE FROM monitoring_sessions WHERE id = $1 RETURNING id`, [sessionId]);

export const pauseSession = async (sessionId) => changeStatus(sessionId, "PAUSED", { endTime: null });
export const resumeSession = async (sessionId) => changeStatus(sessionId, "ACTIVE", { endTime: null });
export const endSession = async (sessionId) => changeStatus(sessionId, "ENDED", { endTime: new Date() });

export const createTelemetryData = async (payload = {}) => {
  const { monitoringSessionId, temperature = null, humidity = null, vibration = null, latitude = null, longitude = null, createdAt = null } = payload;
  if (!monitoringSessionId) {
    throw httpError("monitoringSessionId is required", 400);
  }

  return single(
    `
      INSERT INTO telemetry_data (monitoring_session_id, temperature, humidity, vibration, latitude, longitude, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, monitoring_session_id AS "monitoringSessionId", temperature, humidity, vibration, latitude, longitude,
                created_at AS "createdAt", inserted_at AS "insertedAt", updated_at AS "updatedAt"
    `,
    [monitoringSessionId, temperature, humidity, vibration, latitude, longitude, createdAt]
  );
};

export const getTelemetryData = async (id) => single(
  `
    SELECT id, monitoring_session_id AS "monitoringSessionId", temperature, humidity, vibration, latitude, longitude,
           created_at AS "createdAt", inserted_at AS "insertedAt", updated_at AS "updatedAt"
    FROM telemetry_data
    WHERE id = $1
    LIMIT 1
  `,
  [id]
);

export const deleteTelemetryData = async (id) => query(`DELETE FROM telemetry_data WHERE id = $1 RETURNING id`, [id]);

export const listTelemetryBySession = async (sessionId) => query(
  `
    SELECT td.id, td.monitoring_session_id AS "monitoringSessionId", td.temperature, td.humidity, td.vibration,
           td.latitude, td.longitude, td.created_at AS "createdAt", td.inserted_at AS "insertedAt", td.updated_at AS "updatedAt"
    FROM telemetry_data td
    WHERE td.monitoring_session_id = $1
    ORDER BY td.id DESC
  `,
  [sessionId]
);

const changeStatus = async (sessionId, status, extra = {}) => {
  const session = await getSession(sessionId);
  if (!session) {
    throw httpError("Monitoring session not found", 404);
  }

  return single(
    `
      UPDATE monitoring_sessions
      SET status = $2,
          end_time = COALESCE($3, end_time)
      WHERE id = $1
      RETURNING id, device_id AS "deviceId", trip_id AS "tripId", start_time AS "startTime", end_time AS "endTime", created_at AS "createdAt", status
    `,
    [sessionId, status, extra.endTime || null]
  );
};
