import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const runSingle = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const parseObject = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const toNumberOrNull = (value) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildLocation = (payload = {}) => {
  if (payload.location != null) {
    return payload.location;
  }
  return {
    address: payload.address ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null
  };
};

const toOriginPointResource = (row) => {
  if (!row) {
    return null;
  }

  const location = parseObject(row.location) || {};
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? location.address ?? null,
    latitude: toNumberOrNull(row.latitude ?? location.latitude),
    longitude: toNumberOrNull(row.longitude ?? location.longitude)
  };
};

const buildOrderThresholds = (payload = {}) => {
  if (payload.orderThresholds != null) {
    return payload.orderThresholds;
  }
  return {
    minHumidity: payload.minHumidity ?? null,
    maxHumidity: payload.maxHumidity ?? null,
    minTemperature: payload.minTemperature ?? null,
    maxTemperature: payload.maxTemperature ?? null,
    maxVibration: payload.maxVibration ?? null
  };
};

const toDeliveryOrderResource = (row) => {
  if (!row) {
    return null;
  }

  const location = parseObject(row.location) || {};
  const orderThresholds = parseObject(row.orderThresholds) || {};

  return {
    id: row.id,
    tripId: row.tripId,
    clientEmail: row.clientEmail,
    sequenceOrder: row.sequenceOrder,
    address: row.address ?? location.address ?? null,
    arrivalAt: row.arrivalAt,
    status: row.status,
    minHumidity: toNumberOrNull(orderThresholds.minHumidity),
    maxHumidity: toNumberOrNull(orderThresholds.maxHumidity),
    minTemperature: toNumberOrNull(orderThresholds.minTemperature),
    maxTemperature: toNumberOrNull(orderThresholds.maxTemperature),
    maxVibration: toNumberOrNull(orderThresholds.maxVibration),
    latitude: toNumberOrNull(row.latitude ?? location.latitude),
    longitude: toNumberOrNull(row.longitude ?? location.longitude),
    createdAt: row.createdAt
  };
};

const toTripResource = async (row) => {
  const originPoint = row.originPointId ? await getOriginPoint(row.originPointId) : null;
  const deliveryOrders = await listDeliveryOrdersByTrip(row.id);

  return {
    id: row.id,
    merchantId: row.merchantId,
    driverId: row.driverId,
    deviceId: row.deviceId,
    vehicleId: row.vehicleId,
    status: row.status,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    originPoint,
    deliveryOrders
  };
};

export const listOriginPoints = async () => query(
  `
    SELECT id, name, location, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM origin_points
    ORDER BY id ASC
  `
).then((rows) => rows.map(toOriginPointResource));

export const listOriginPointsByName = async (name) => query(
  `
    SELECT id, name, location, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM origin_points
    WHERE name ILIKE $1
    ORDER BY id ASC
  `,
  [`%${name}%`]
).then((rows) => rows.map(toOriginPointResource));

export const getOriginPoint = async (id) => runSingle(
  `
    SELECT id, name, location, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM origin_points
    WHERE id = $1
    LIMIT 1
  `,
  [id]
).then(toOriginPointResource);

export const createOriginPoint = async (payload = {}) => {
  const { name } = payload;
  const location = buildLocation(payload);

  if (!name || location == null) {
    throw httpError("Name and location are required", 400);
  }

  const row = await runSingle(
    `
      INSERT INTO origin_points (name, location)
      VALUES ($1, $2)
      RETURNING id, name, location, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [name, location]
  );

  return toOriginPointResource(row);
};

export const updateOriginPoint = async (id, payload = {}) => {
  const current = await getOriginPoint(id);
  if (!current) {
    throw httpError("Origin point not found", 404);
  }

  const nextName = payload.name ?? current.name;
  const nextLocation = payload.location ?? buildLocation({
    address: payload.address ?? current.address,
    latitude: payload.latitude ?? current.latitude,
    longitude: payload.longitude ?? current.longitude
  });

  return runSingle(
    `
      UPDATE origin_points
      SET name = $2,
          location = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, location, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, nextName, nextLocation]
  ).then(toOriginPointResource);
};

export const deleteOriginPoint = async (id) => query(`DELETE FROM origin_points WHERE id = $1 RETURNING id`, [id]);

export const listTrips = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.merchantId) {
    params.push(filters.merchantId);
    conditions.push(`t.merchant_id = $${params.length}`);
  }

  if (filters.driverId) {
    params.push(filters.driverId);
    conditions.push(`t.driver_id = $${params.length}`);
  }

  if (filters.vehicleId) {
    params.push(filters.vehicleId);
    conditions.push(`t.vehicle_id = $${params.length}`);
  }

  if (filters.originPointId) {
    params.push(filters.originPointId);
    conditions.push(`t.origin_point_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`t.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `
      SELECT t.id,
             t.merchant_id AS "merchantId",
             t.driver_id AS "driverId",
             t.device_id AS "deviceId",
             t.vehicle_id AS "vehicleId",
             t.origin_point_id AS "originPointId",
             t.status,
             t.started_at AS "startedAt",
             t.completed_at AS "completedAt",
             t.created_at AS "createdAt",
             t.updated_at AS "updatedAt"
      FROM trips t
      ${whereClause}
      ORDER BY t.id DESC
    `,
    params
  );

  return Promise.all(rows.map(toTripResource));
};

export const getTrip = async (id) => runSingle(
  `
    SELECT t.id,
           t.merchant_id AS "merchantId",
           t.driver_id AS "driverId",
           t.device_id AS "deviceId",
           t.vehicle_id AS "vehicleId",
           t.origin_point_id AS "originPointId",
           t.status,
           t.started_at AS "startedAt",
           t.completed_at AS "completedAt",
           t.created_at AS "createdAt",
           t.updated_at AS "updatedAt"
    FROM trips t
    WHERE t.id = $1
    LIMIT 1
  `,
  [id]
).then(async (row) => (row ? toTripResource(row) : null));

export const deleteTrip = async (id) => query(`DELETE FROM trips WHERE id = $1 RETURNING id`, [id]);

export const createTrip = async (payload = {}) => {
  const { merchantId, driverId, deviceId = null, vehicleId = null, originPointId = null, status = "PLANNED" } = payload;

  if (!merchantId || !driverId) {
    throw httpError("merchantId and driverId are required", 400);
  }

  return runSingle(
    `
      INSERT INTO trips (merchant_id, driver_id, device_id, vehicle_id, origin_point_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, merchant_id AS "merchantId", driver_id AS "driverId", device_id AS "deviceId",
                vehicle_id AS "vehicleId", origin_point_id AS "originPointId", status,
                started_at AS "startedAt", completed_at AS "completedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [merchantId, driverId, deviceId, vehicleId, originPointId, status]
  );
};

export const updateTripStatus = async (id, status) => {
  const current = await getTrip(id);
  if (!current) {
    throw httpError("Trip not found", 404);
  }

  const updates = {
    IN_PROGRESS: { startedAt: current.startedAt || new Date() },
    COMPLETED: { completedAt: new Date() },
    CANCELLED: {}
  };

  const next = updates[status] || {};

  return runSingle(
    `
      UPDATE trips
      SET status = $2,
          started_at = COALESCE($3, started_at),
          completed_at = COALESCE($4, completed_at),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, merchant_id AS "merchantId", driver_id AS "driverId", device_id AS "deviceId",
                vehicle_id AS "vehicleId", origin_point_id AS "originPointId", status,
                started_at AS "startedAt", completed_at AS "completedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, status, next.startedAt || null, next.completedAt || null]
  );
};

export const searchTrips = async (filters = {}) => listTrips(filters);

export const listTripsByMerchant = async (merchantId) => listTrips({ merchantId });

export const listDeliveryOrders = async () => query(
  `
    SELECT id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
           arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM delivery_orders
    ORDER BY id DESC
  `
).then((rows) => rows.map(toDeliveryOrderResource));

export const getDeliveryOrder = async (id) => runSingle(
  `
    SELECT id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
           arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM delivery_orders
    WHERE id = $1
    LIMIT 1
  `,
  [id]
).then(toDeliveryOrderResource);

export const createDeliveryOrder = async (payload = {}) => {
  const { tripId, clientEmail, sequenceOrder, arrivalAt = null, status = "PENDING" } = payload;
  const orderThresholds = buildOrderThresholds(payload);
  const location = buildLocation(payload);

  if (!tripId || !clientEmail || sequenceOrder == null) {
    throw httpError("tripId, clientEmail and sequenceOrder are required", 400);
  }

  return runSingle(
    `
      INSERT INTO delivery_orders (trip_id, client_email, sequence_order, arrival_at, order_thresholds, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
                arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
                created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [tripId, clientEmail, sequenceOrder, arrivalAt, orderThresholds, location, status]
  ).then(toDeliveryOrderResource);
};

export const updateDeliveryOrder = async (id, payload = {}) => {
  const current = await getDeliveryOrder(id);
  if (!current) {
    throw httpError("Delivery order not found", 404);
  }

  const next = {
    tripId: payload.tripId ?? current.tripId,
    clientEmail: payload.clientEmail ?? current.clientEmail,
    sequenceOrder: payload.sequenceOrder ?? current.sequenceOrder,
    arrivalAt: payload.arrivalAt ?? current.arrivalAt,
    orderThresholds: payload.orderThresholds ?? buildOrderThresholds(payload),
    location: payload.location ?? buildLocation(payload),
    status: payload.status ?? current.status
  };

  return runSingle(
    `
      UPDATE delivery_orders
      SET trip_id = $2,
          client_email = $3,
          sequence_order = $4,
          arrival_at = $5,
          order_thresholds = $6,
          location = $7,
          status = $8,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
                arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
                created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, next.tripId, next.clientEmail, next.sequenceOrder, next.arrivalAt, next.orderThresholds, next.location, next.status]
  ).then(toDeliveryOrderResource);
};

export const deleteDeliveryOrder = async (id) => query(`DELETE FROM delivery_orders WHERE id = $1 RETURNING id`, [id]);

export const markDeliveryOrderDelivered = async (id) => runSingle(
  `
    UPDATE delivery_orders
    SET status = 'DELIVERED',
        arrival_at = COALESCE(arrival_at, NOW()),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
              arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id]
).then(toDeliveryOrderResource);

export const listDeliveryOrdersByTrip = async (tripId) => query(
  `
    SELECT id, trip_id AS "tripId", client_email AS "clientEmail", sequence_order AS "sequenceOrder",
           arrival_at AS "arrivalAt", order_thresholds AS "orderThresholds", location, status,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM delivery_orders
    WHERE trip_id = $1
    ORDER BY sequence_order ASC, id ASC
  `,
  [tripId]
).then((rows) => rows.map(toDeliveryOrderResource));
