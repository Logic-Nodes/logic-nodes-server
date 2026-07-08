import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const DEMO_EMAIL = process.env.DEMO_SEED_EMAIL || "demo.mobile.2026@omnitrack.io";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "DemoMobile123!";

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
});

const run = async (sql, params = []) => {
  const result = await client.query(sql, params);
  return result.rows;
};

try {
  await client.connect();
  console.log("Seeding demo data on", process.env.DB_HOST);

  const roleRows = await run(`SELECT id, name FROM roles`);
  if (roleRows.length === 0) {
    await run(`INSERT INTO roles (name) VALUES ('FLEET_MANAGER'), ('CUSTOMER'), ('ADMIN') ON CONFLICT DO NOTHING`);
  }
  const roleId = (await run(`SELECT id FROM roles WHERE name = 'FLEET_MANAGER' LIMIT 1`))[0]?.id;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userRows = await run(
    `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email
    `,
    [DEMO_EMAIL, passwordHash]
  );
  const userId = userRows[0].id;
  if (roleId) {
    await run(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
  }

  await run(
    `
      INSERT INTO profiles (first_name, last_name, phone_number, user_id)
      VALUES ('Demo', 'Mobile', '+51999000000', $1)
      ON CONFLICT DO NOTHING
    `,
    [userId]
  ).catch(async () => {
    const existing = await run(`SELECT id FROM profiles WHERE user_id = $1 LIMIT 1`, [userId]);
    if (existing.length === 0) {
      await run(
        `INSERT INTO profiles (first_name, last_name, phone_number, user_id) VALUES ('Demo', 'Mobile', '+51999000000', $1)`,
        [userId]
      );
    }
  });

  const merchantRows = await run(
    `
      INSERT INTO merchants (name, contact_email, fiscal_address, ruc, is_active)
      VALUES ('North Coast Logistics', $1, 'Av. Demo 123, Lima', '20123456789', true)
      ON CONFLICT (ruc) DO UPDATE SET contact_email = EXCLUDED.contact_email, updated_at = NOW()
      RETURNING id
    `,
    [DEMO_EMAIL]
  );
  let merchantId = merchantRows[0]?.id;
  if (!merchantId) {
    merchantId = (await run(`SELECT id FROM merchants WHERE contact_email = $1 LIMIT 1`, [DEMO_EMAIL]))[0]?.id;
  }

  if (merchantId) {
    await run(
      `INSERT INTO employees (merchant_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [merchantId, userId]
    ).catch(() => undefined);
  }

  const deviceRows = await run(
    `
      INSERT INTO devices (imei, firmware, online, vehicle_plate)
      VALUES ('123456789012345', '1.0.0', true, 'DEMO-001')
      ON CONFLICT (imei) DO UPDATE SET online = true, vehicle_plate = EXCLUDED.vehicle_plate, updated_at = NOW()
      RETURNING id, imei
    `
  );
  const deviceId = deviceRows[0].id;

  const vehicleRows = await run(
    `
      INSERT INTO vehicles (plate, type, status, odometer_km)
      VALUES ('DEMO-001', 'TRUCK', 'IN_TRIP', 12500)
      ON CONFLICT (plate) DO UPDATE SET status = 'IN_TRIP', updated_at = NOW()
      RETURNING id, plate
    `
  );
  const vehicleId = vehicleRows[0].id;

  await run(
    `
      INSERT INTO vehicle_device_imeis (vehicle_id, device_imei)
      VALUES ($1, '123456789012345')
      ON CONFLICT DO NOTHING
    `,
    [vehicleId]
  );

  let originPointId = (await run(`SELECT id FROM origin_points WHERE name = 'Almacén Central' LIMIT 1`))[0]?.id;
  if (!originPointId) {
    const originRows = await run(
      `
        INSERT INTO origin_points (name, location)
        VALUES ('Almacén Central', '{"address":"Av. Industrial 500","latitude":-12.05,"longitude":-77.05}')
        RETURNING id
      `
    );
    originPointId = originRows[0].id;
  }

  let tripId = (await run(`SELECT id FROM trips WHERE tracking_code = 'DEMO7K9M2' LIMIT 1`))[0]?.id;
  if (!tripId && merchantId) {
    const created = await run(
      `
        INSERT INTO trips (merchant_id, driver_id, device_id, vehicle_id, origin_point_id, status, tracking_code, started_at)
        VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', 'DEMO7K9M2', NOW() - INTERVAL '2 hours')
        RETURNING id
      `,
      [merchantId, userId, deviceId, vehicleId, originPointId]
    );
    tripId = created[0].id;
  }

  let deliveryOrderId;
  if (tripId) {
    const orderRows = await run(
      `
        INSERT INTO delivery_orders (trip_id, client_email, sequence_order, location, status, arrival_at)
        VALUES ($1, 'cliente@demo.io', 1, '{"address":"Jr. Entrega 42","latitude":-12.08,"longitude":-77.02}', 'PENDING', NOW() + INTERVAL '1 day')
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [tripId]
    ).catch(async () => {
      const existing = await run(`SELECT id FROM delivery_orders WHERE trip_id = $1 LIMIT 1`, [tripId]);
      return existing;
    });
    deliveryOrderId = orderRows[0]?.id;
  }

  let sessionId;
  if (tripId && deviceId) {
    const sessionRows = await run(
      `
        INSERT INTO monitoring_sessions (device_id, trip_id, start_time, status)
        VALUES ($1, $2, NOW() - INTERVAL '2 hours', 'ACTIVE')
        RETURNING id
      `,
      [deviceId, tripId]
    );
    sessionId = sessionRows[0]?.id || (await run(
      `SELECT id FROM monitoring_sessions WHERE trip_id = $1 ORDER BY id DESC LIMIT 1`,
      [tripId]
    ))[0]?.id;
  }

  if (sessionId) {
    const telemetryCount = (await run(
      `SELECT COUNT(*)::int AS count FROM telemetry_data WHERE monitoring_session_id = $1`,
      [sessionId]
    ))[0].count;
    if (telemetryCount < 10) {
      for (let i = 0; i < 12; i += 1) {
        await run(
          `
            INSERT INTO telemetry_data (monitoring_session_id, temperature, humidity, vibration, latitude, longitude, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7 || ' minutes')::interval)
          `,
          [sessionId, 4 + i * 0.2, 55 + i, 0.1 * i, -12.05 + i * 0.001, -77.05 + i * 0.001, String(120 - i * 5)]
        );
      }
    }
  }

  if (deliveryOrderId) {
    const alertCount = (await run(`SELECT COUNT(*)::int AS count FROM alerts`))[0].count;
    if (alertCount < 2) {
      const alert = await run(
        `
          INSERT INTO alerts (delivery_order_id, alert_type, alert_status)
          VALUES ($1, 'TEMPERATURE', 'OPEN')
          RETURNING id
        `,
        [deliveryOrderId]
      );
      await run(
        `INSERT INTO incidents (alert_id, description) VALUES ($1, 'Temperatura fuera de rango en demo seed')`,
        [alert[0].id]
      );
      await run(
        `
          INSERT INTO notifications (alert_id, notification_channel, message)
          VALUES ($1, 'PUSH', 'Alerta térmica demo — revisar cadena de frío')
        `,
        [alert[0].id]
      );
    }
  }

  const planId = (await run(`SELECT id FROM plans ORDER BY price DESC LIMIT 1`))[0]?.id;
  if (planId) {
    await run(
      `
        INSERT INTO subscriptions (user_id, plan_id, status, renewal, payment_method)
        VALUES ($1, $2, 'ACTIVE', CURRENT_DATE + INTERVAL '30 days', 'demo-card')
        ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, renewal = EXCLUDED.renewal, updated_at = NOW()
      `,
      [userId, planId]
    );
  }

  console.log("Demo seed complete:");
  console.log("  user:", DEMO_EMAIL, "/", DEMO_PASSWORD);
  console.log("  merchantId:", merchantId);
  console.log("  tripId:", tripId, "tracking: DEMO7K9M2");
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
