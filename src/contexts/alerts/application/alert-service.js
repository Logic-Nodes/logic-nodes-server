import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const listAlerts = async () => query(
  `
    SELECT id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM alerts
    ORDER BY id DESC
  `
);

export const getAlert = async (id) => single(
  `
    SELECT id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM alerts
    WHERE id = $1
    LIMIT 1
  `,
  [id]
);

export const createAlert = async (payload = {}) => {
  const { deliveryOrderId = null, alertType, alertStatus = "OPEN" } = payload;
  if (!alertType) {
    throw httpError("alertType is required", 400);
  }

  return single(
    `
      INSERT INTO alerts (delivery_order_id, alert_type, alert_status)
      VALUES ($1, $2, $3)
      RETURNING id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [deliveryOrderId, alertType, alertStatus]
  );
};

export const acknowledgeAlert = async (id) => updateAlertStatus(id, "ACKNOWLEDGED");
export const closeAlert = async (id) => updateAlertStatus(id, "CLOSED");

export const listAlertsByType = async (type) => query(
  `
    SELECT id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM alerts
    WHERE alert_type = $1
    ORDER BY id DESC
  `,
  [type]
);

export const listAlertsByStatus = async (status) => query(
  `
    SELECT id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM alerts
    WHERE alert_status = $1
    ORDER BY id DESC
  `,
  [status]
);

export const listIncidentsByAlert = async (alertId) => query(
  `
    SELECT id, alert_id AS "alertId", description, created_at AS "createdAt", acknowledged_at AS "acknowledgedAt",
           closed_at AS "closedAt", inserted_at AS "insertedAt", updated_at AS "updatedAt"
    FROM incidents
    WHERE alert_id = $1
    ORDER BY id DESC
  `,
  [alertId]
);

export const createIncident = async (payload = {}) => {
  const { alertId, description = null } = payload;
  if (!alertId) {
    throw httpError("alertId is required", 400);
  }

  return single(
    `
      INSERT INTO incidents (alert_id, description)
      VALUES ($1, $2)
      RETURNING id, alert_id AS "alertId", description, created_at AS "createdAt", acknowledged_at AS "acknowledgedAt",
                closed_at AS "closedAt", inserted_at AS "insertedAt", updated_at AS "updatedAt"
    `,
    [alertId, description]
  );
};

export const acknowledgeIncident = async (id) => updateIncidentTimestamps(id, { acknowledgedAt: new Date() });
export const closeIncident = async (id) => updateIncidentTimestamps(id, { closedAt: new Date() });

export const listNotificationsByAlert = async (alertId) => query(
  `
    SELECT id, alert_id AS "alertId", notification_channel AS "notificationChannel", message, sent_at AS "sentAt",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM notifications
    WHERE alert_id = $1
    ORDER BY id DESC
  `,
  [alertId]
);

export const createNotification = async (payload = {}) => {
  const { alertId, notificationChannel = null, message = null, sentAt = null } = payload;
  if (!alertId) {
    throw httpError("alertId is required", 400);
  }

  return single(
    `
      INSERT INTO notifications (alert_id, notification_channel, message, sent_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, alert_id AS "alertId", notification_channel AS "notificationChannel", message, sent_at AS "sentAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [alertId, notificationChannel, message, sentAt]
  );
};

export const sendNotificationNow = async (id) => single(
  `
    UPDATE notifications
    SET sent_at = COALESCE(sent_at, NOW()),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, alert_id AS "alertId", notification_channel AS "notificationChannel", message, sent_at AS "sentAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id]
);

const updateAlertStatus = async (id, status) => {
  const alert = await getAlert(id);
  if (!alert) {
    throw httpError("Alert not found", 404);
  }

  return single(
    `
      UPDATE alerts
      SET alert_status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, delivery_order_id AS "deliveryOrderId", alert_type AS "alertType", alert_status AS "alertStatus", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, status]
  );
};

const updateIncidentTimestamps = async (id, timestamps = {}) => single(
  `
    UPDATE incidents
    SET acknowledged_at = COALESCE($2, acknowledged_at),
        closed_at = COALESCE($3, closed_at),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, alert_id AS "alertId", description, created_at AS "createdAt", acknowledged_at AS "acknowledgedAt",
              closed_at AS "closedAt", inserted_at AS "insertedAt", updated_at AS "updatedAt"
  `,
  [id, timestamps.acknowledgedAt || null, timestamps.closedAt || null]
);
