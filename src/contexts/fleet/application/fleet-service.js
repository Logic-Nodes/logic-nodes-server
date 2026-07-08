import crypto from "crypto";

import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const generateDeviceSecret = () => crypto.randomBytes(24).toString("hex");

export const listDevices = async () => query(
  `
    SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM devices
    ORDER BY id DESC
  `
);

export const getDevice = async (id) => single(
  `
    SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM devices
    WHERE id = $1
    LIMIT 1
  `,
  [id]
);

export const getDeviceByImei = async (imei) => single(
  `
    SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM devices
    WHERE imei = $1
    LIMIT 1
  `,
  [imei]
);

export const listDevicesByOnline = async (online) => query(
  `
    SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM devices
    WHERE online = $1
    ORDER BY id DESC
  `,
  [online === true || online === "true"]
);

export const createDevice = async (payload = {}) => {
  const { imei, firmware, online = false, vehiclePlate = null } = payload;
  if (!imei || !firmware) {
    throw httpError("imei and firmware are required", 400);
  }

  // Each device gets a secret so it can authenticate the HTTP telemetry ingest.
  // It is returned only here (creation), never on normal reads.
  const deviceSecret = payload.deviceSecret || generateDeviceSecret();

  const device = await single(
    `
      INSERT INTO devices (imei, firmware, online, vehicle_plate, device_secret)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [imei, firmware, Boolean(online), vehiclePlate, deviceSecret]
  );

  return { ...device, deviceSecret };
};

export const rotateDeviceSecret = async (imei) => {
  const deviceSecret = generateDeviceSecret();
  const device = await single(
    `
      UPDATE devices
      SET device_secret = $2,
          updated_at = NOW()
      WHERE imei = $1
      RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [imei, deviceSecret]
  );

  if (!device) {
    throw httpError("Device not found", 404);
  }

  return { ...device, deviceSecret };
};

// Validates the credentials an IoT device presents on each ingest call.
export const verifyDeviceCredentials = async (imei, secret) => {
  if (!imei || !secret) {
    throw httpError("imei and device secret are required", 401);
  }

  const row = await single(
    `SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", device_secret AS "deviceSecret" FROM devices WHERE imei = $1 LIMIT 1`,
    [imei]
  );

  if (!row || !row.deviceSecret) {
    throw httpError("Unknown device or missing secret", 401);
  }

  const provided = Buffer.from(String(secret));
  const expected = Buffer.from(String(row.deviceSecret));
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw httpError("Invalid device credentials", 401);
  }

  const { deviceSecret, ...device } = row;
  return device;
};

// Marks a device online and refreshes its liveness timestamp on each ingest.
export const touchDeviceOnline = async (imei) => single(
  `
    UPDATE devices
    SET online = TRUE,
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE imei = $1
    RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", last_seen_at AS "lastSeenAt", created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [imei]
);

// Devices that were online but stopped reporting within the given window.
export const findStaleOnlineDevices = async (offlineAfterSeconds) => query(
  `
    SELECT id, imei, firmware, online, vehicle_plate AS "vehiclePlate", last_seen_at AS "lastSeenAt"
    FROM devices
    WHERE online = TRUE
      AND (last_seen_at IS NULL OR last_seen_at < NOW() - ($1 || ' seconds')::interval)
    ORDER BY id ASC
  `,
  [String(Math.max(1, Number(offlineAfterSeconds) || 90))]
);

export const markDeviceOffline = async (id) => single(
  `
    UPDATE devices
    SET online = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", last_seen_at AS "lastSeenAt", created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id]
);

export const updateDevice = async (id, payload = {}) => {
  const current = await getDevice(id);
  if (!current) {
    throw httpError("Device not found", 404);
  }

  const next = {
    imei: payload.imei ?? current.imei,
    firmware: payload.firmware ?? current.firmware,
    online: payload.online ?? current.online,
    vehiclePlate: payload.vehiclePlate ?? current.vehiclePlate
  };

  return single(
    `
      UPDATE devices
      SET imei = $2,
          firmware = $3,
          online = $4,
          vehicle_plate = $5,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, next.imei, next.firmware, Boolean(next.online), next.vehiclePlate]
  );
};

export const deleteDevice = async (id) => query(
  `DELETE FROM devices WHERE id = $1 RETURNING id`,
  [id]
);

export const updateDeviceFirmware = async (id, firmware) => single(
  `
    UPDATE devices
    SET firmware = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id, firmware]
);

export const setDeviceOnlineStatus = async (id, online) => single(
  `
    UPDATE devices
    SET online = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, imei, firmware, online, vehicle_plate AS "vehiclePlate", created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id, Boolean(online)]
);

export const listVehicles = async () => query(
  `
    SELECT v.id, v.plate, v.type, v.status, v.odometer_km AS "odometerKm",
           v.created_at AS "createdAt", v.updated_at AS "updatedAt",
           COALESCE(json_agg(DISTINCT vc.capability) FILTER (WHERE vc.capability IS NOT NULL), '[]') AS capabilities,
           COALESCE(json_agg(DISTINCT vd.device_imei) FILTER (WHERE vd.device_imei IS NOT NULL), '[]') AS "deviceImeis"
    FROM vehicles v
    LEFT JOIN vehicle_capabilities vc ON vc.vehicle_id = v.id
    LEFT JOIN vehicle_device_imeis vd ON vd.vehicle_id = v.id
    GROUP BY v.id
    ORDER BY v.id DESC
  `
);

export const getVehicle = async (id) => single(
  `
    SELECT v.id, v.plate, v.type, v.status, v.odometer_km AS "odometerKm",
           v.created_at AS "createdAt", v.updated_at AS "updatedAt",
           COALESCE(json_agg(DISTINCT vc.capability) FILTER (WHERE vc.capability IS NOT NULL), '[]') AS capabilities,
           COALESCE(json_agg(DISTINCT vd.device_imei) FILTER (WHERE vd.device_imei IS NOT NULL), '[]') AS "deviceImeis"
    FROM vehicles v
    LEFT JOIN vehicle_capabilities vc ON vc.vehicle_id = v.id
    LEFT JOIN vehicle_device_imeis vd ON vd.vehicle_id = v.id
    WHERE v.id = $1
    GROUP BY v.id
    LIMIT 1
  `,
  [id]
);

export const getVehicleByPlate = async (plate) => single(
  `
    SELECT v.id, v.plate, v.type, v.status, v.odometer_km AS "odometerKm",
           v.created_at AS "createdAt", v.updated_at AS "updatedAt"
    FROM vehicles v
    WHERE v.plate = $1
    LIMIT 1
  `,
  [plate]
);

export const listVehiclesByStatus = async (status) => query(
  `SELECT id, plate, type, status, odometer_km AS "odometerKm", created_at AS "createdAt", updated_at AS "updatedAt" FROM vehicles WHERE status = $1 ORDER BY id DESC`,
  [status]
);

export const listVehiclesByType = async (type) => query(
  `SELECT id, plate, type, status, odometer_km AS "odometerKm", created_at AS "createdAt", updated_at AS "updatedAt" FROM vehicles WHERE type = $1 ORDER BY id DESC`,
  [type]
);

export const createVehicle = async (payload = {}) => {
  const { plate, type, status, odometerKm = 0, capabilities = [], deviceImeis = [] } = payload;
  if (!plate || !type || !status) {
    throw httpError("plate, type and status are required", 400);
  }

  const vehicle = await single(
    `
      INSERT INTO vehicles (plate, type, status, odometer_km)
      VALUES ($1, $2, $3, $4)
      RETURNING id, plate, type, status, odometer_km AS "odometerKm", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [plate, type, status, odometerKm]
  );

  for (const capability of capabilities) {
    await query(`INSERT INTO vehicle_capabilities (vehicle_id, capability) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [vehicle.id, capability]);
  }

  for (const imei of deviceImeis) {
    await query(`INSERT INTO vehicle_device_imeis (vehicle_id, device_imei) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [vehicle.id, imei]);
    await query(`UPDATE devices SET vehicle_plate = $1, updated_at = NOW() WHERE imei = $2`, [plate, imei]);
  }

  return { ...vehicle, capabilities, deviceImeis };
};

export const updateVehicle = async (id, payload = {}) => {
  const current = await getVehicle(id);
  if (!current) {
    throw httpError("Vehicle not found", 404);
  }

  const next = {
    plate: payload.plate ?? current.plate,
    type: payload.type ?? current.type,
    status: payload.status ?? current.status,
    odometerKm: payload.odometerKm ?? current.odometerKm
  };

  return single(
    `
      UPDATE vehicles
      SET plate = $2,
          type = $3,
          status = $4,
          odometer_km = $5,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, plate, type, status, odometer_km AS "odometerKm", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, next.plate, next.type, next.status, next.odometerKm]
  );
};

export const deleteVehicle = async (id) => query(`DELETE FROM vehicles WHERE id = $1 RETURNING id`, [id]);

export const assignDevice = async (vehicleId, imei) => {
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    throw httpError("Vehicle not found", 404);
  }

  const device = await getDeviceByImei(imei);
  if (!device) {
    throw httpError("Device not found", 404);
  }

  await query(
    `INSERT INTO vehicle_device_imeis (vehicle_id, device_imei) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [vehicleId, imei]
  );
  await query(`UPDATE devices SET vehicle_plate = $1, updated_at = NOW() WHERE imei = $2`, [vehicle.plate, imei]);

  return { vehicleId, imei };
};

export const unassignDevice = async (vehicleId, imei) => {
  await query(
    `DELETE FROM vehicle_device_imeis WHERE vehicle_id = $1 AND device_imei = $2`,
    [vehicleId, imei]
  );
  await query(`UPDATE devices SET vehicle_plate = NULL, updated_at = NOW() WHERE imei = $1`, [imei]);
  return { vehicleId, imei };
};

export const changeVehicleStatus = async (id, status) => single(
  `
    UPDATE vehicles
    SET status = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, plate, type, status, odometer_km AS "odometerKm", created_at AS "createdAt", updated_at AS "updatedAt"
  `,
  [id, status]
);
