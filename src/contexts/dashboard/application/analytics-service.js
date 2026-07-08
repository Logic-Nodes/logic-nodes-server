import { query } from "../../../shared/infrastructure/db/postgres.js";

const toDashboardTrip = (row) => ({
  id: String(row.id),
  startDate: row.startedAt || row.createdAt,
  endDate: row.completedAt || row.createdAt,
  origin: row.originName || "—",
  destination: row.destinationAddress || "—",
  vehiclePlate: row.vehiclePlate || "—",
  driverName: row.driverName || "—",
  cargoType: row.cargoType || "General",
  status: row.status,
  distance: Number(row.distanceKm || 0),
  alerts: row.alertTypes || []
});

const toDashboardAlert = (row) => ({
  id: String(row.id),
  tripId: row.tripId ? String(row.tripId) : "",
  deviceId: row.deviceId ? String(row.deviceId) : "",
  vehiclePlate: row.vehiclePlate || "—",
  type: row.alertType,
  severity: row.severity || "MEDIUM",
  value: row.value != null ? Number(row.value) : undefined,
  timestamp: row.createdAt,
  location: {
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    address: row.address || ""
  },
  resolved: row.alertStatus === "CLOSED"
});

export const tripsSummary = async () => {
  const rows = await query(
    `
      SELECT status, COUNT(*)::int AS count
      FROM trips
      GROUP BY status
      ORDER BY status
    `
  );
  return { byStatus: rows };
};

export const tripsDashboard = async () => {
  const rows = await query(
    `
      SELECT t.id,
             t.status,
             t.started_at AS "startedAt",
             t.completed_at AS "completedAt",
             t.created_at AS "createdAt",
             op.name AS "originName",
             (do.location->>'address') AS "destinationAddress",
             v.plate AS "vehiclePlate",
             COALESCE(p.first_name || ' ' || p.last_name, u.email) AS "driverName",
             COALESCE(v.type::text, 'General') AS "cargoType",
             COALESCE(v.odometer_km, 0) AS "distanceKm",
             COALESCE(array_agg(DISTINCT a.alert_type::text) FILTER (WHERE a.id IS NOT NULL), '{}') AS "alertTypes"
      FROM trips t
      LEFT JOIN origin_points op ON op.id = t.origin_point_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN users u ON u.id = t.driver_id
      LEFT JOIN profiles p ON p.user_id = t.driver_id
      LEFT JOIN delivery_orders do ON do.trip_id = t.id AND do.sequence_order = 1
      LEFT JOIN alerts a ON a.delivery_order_id = do.id
      GROUP BY t.id, op.name, do.location, v.plate, p.first_name, p.last_name, u.email, v.type, v.odometer_km
      ORDER BY t.id DESC
      LIMIT 100
    `
  );

  return rows.map(toDashboardTrip);
};

export const tripDetail = async (tripId) => {
  const items = await tripsDashboard();
  const trip = items.find((entry) => entry.id === String(tripId));
  if (!trip) {
    const [row] = await query(`SELECT id FROM trips WHERE id = $1 LIMIT 1`, [tripId]);
    if (!row) {
      return null;
    }
  }
  return trip || items[0];
};

export const alertsSummary = async () => {
  const [byStatus, byType] = await Promise.all([
    query(`SELECT alert_status AS status, COUNT(*)::int AS count FROM alerts GROUP BY alert_status ORDER BY alert_status`),
    query(`SELECT alert_type AS type, COUNT(*)::int AS count FROM alerts GROUP BY alert_type ORDER BY alert_type`)
  ]);

  return { byStatus, byType };
};

export const alertsDashboard = async (tripId = null) => {
  const params = [];
  let tripFilter = "";
  if (tripId) {
    params.push(tripId);
    tripFilter = `AND t.id = $${params.length}`;
  }

  const rows = await query(
    `
      SELECT a.id,
             a.alert_type AS "alertType",
             a.alert_status AS "alertStatus",
             a.created_at AS "createdAt",
             t.id AS "tripId",
             t.device_id AS "deviceId",
             v.plate AS "vehiclePlate",
             CASE
               WHEN a.alert_type = 'TEMPERATURE' THEN 'HIGH'
               WHEN a.alert_type = 'DELAY' THEN 'MEDIUM'
               ELSE 'LOW'
             END AS severity,
             td.temperature AS value,
             td.latitude,
             td.longitude,
             COALESCE(do.location->>'address', '') AS address
      FROM alerts a
      LEFT JOIN delivery_orders do ON do.id = a.delivery_order_id
      LEFT JOIN trips t ON t.id = do.trip_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN monitoring_sessions ms ON ms.trip_id = t.id
      LEFT JOIN LATERAL (
        SELECT temperature, latitude, longitude
        FROM telemetry_data
        WHERE monitoring_session_id = ms.id
        ORDER BY created_at DESC
        LIMIT 1
      ) td ON true
      WHERE 1 = 1
      ${tripFilter}
      ORDER BY a.id DESC
      LIMIT 200
    `,
    params
  );

  return rows.map(toDashboardAlert);
};

export const incidentsByMonth = async () => query(
  `
    SELECT ROW_NUMBER() OVER (ORDER BY month_bucket) AS id,
           to_char(month_bucket, 'Mon') AS month,
           EXTRACT(YEAR FROM month_bucket)::int AS year,
           COUNT(*) FILTER (WHERE alert_type = 'TEMPERATURE')::int AS "temperatureIncidents",
           COUNT(*) FILTER (WHERE alert_type IN ('VIBRATION', 'GEOFENCE'))::int AS "movementIncidents",
           COUNT(*)::int AS "totalIncidents"
    FROM (
      SELECT date_trunc('month', COALESCE(i.created_at, i.inserted_at)) AS month_bucket,
             a.alert_type
      FROM incidents i
      JOIN alerts a ON a.id = i.alert_id
    ) grouped
    GROUP BY month_bucket
    ORDER BY month_bucket DESC
    LIMIT 12
  `
);
