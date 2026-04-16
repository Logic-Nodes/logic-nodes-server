import { query } from "../../../shared/infrastructure/db/postgres.js";

export const tripsSummary = async () => {
  const [rows] = await Promise.all([
    query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM trips
        GROUP BY status
        ORDER BY status
      `
    )
  ]);

  return { byStatus: rows };
};

export const tripDetail = async (tripId) => {
  const [trip] = await query(
    `
      SELECT t.id, t.merchant_id AS "merchantId", t.driver_id AS "driverId", t.device_id AS "deviceId",
             t.vehicle_id AS "vehicleId", t.origin_point_id AS "originPointId", t.status,
             t.started_at AS "startedAt", t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt"
      FROM trips t
      WHERE t.id = $1
      LIMIT 1
    `,
    [tripId]
  );

  const [orders] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM delivery_orders WHERE trip_id = $1`, [tripId])
  ]);

  return { trip, deliveries: orders[0] };
};

export const alertsSummary = async () => {
  const [byStatus, byType] = await Promise.all([
    query(`SELECT alert_status AS status, COUNT(*)::int AS count FROM alerts GROUP BY alert_status ORDER BY alert_status`),
    query(`SELECT alert_type AS type, COUNT(*)::int AS count FROM alerts GROUP BY alert_type ORDER BY alert_type`)
  ]);

  return { byStatus, byType };
};

export const incidentsByMonth = async () => query(
  `
    SELECT to_char(date_trunc('month', COALESCE(created_at, inserted_at)), 'YYYY-MM') AS month,
           COUNT(*)::int AS count
    FROM incidents
    GROUP BY 1
    ORDER BY 1 DESC
  `
);
