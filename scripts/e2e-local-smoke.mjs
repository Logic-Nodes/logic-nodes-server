/**
 * Smoke E2E local — simula flujo mobile contra http://127.0.0.1:3001
 * Uso: node scripts/e2e-local-smoke.mjs
 */
import dotenv from "dotenv";

dotenv.config();

const BASE = `http://127.0.0.1:${process.env.PORT || 3001}`;
const EMAIL = process.env.DEMO_SEED_EMAIL || "demo.mobile.2026@omnitrack.io";
const PASSWORD = process.env.DEMO_SEED_PASSWORD || "DemoMobile123!";
const TRACKING = "DEMO7K9M2";

const results = [];

const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
};

const json = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
};

const userIdFromJwt = (token) => {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return decoded.sub ?? decoded.id ?? decoded.userId ?? null;
};

try {
  const docs = await fetch(`${BASE}/docs/`);
  check("GET /docs", docs.ok, String(docs.status));

  const signIn = await fetch(`${BASE}/api/v1/authentication/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const authBody = await json(signIn);
  const auth = authBody?.data ?? authBody;
  const token = auth?.accessToken;
  const userId = userIdFromJwt(token);
  check("POST sign-in", signIn.ok && !!token, `user ${EMAIL} id=${userId}`);
  if (!token || !userId) throw new Error("No access token or user id in JWT");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const verify = await fetch(`${BASE}/api/v1/authentication/verify-token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token }),
  });
  check("POST verify-token", verify.ok, String(verify.status));

  const profile = await fetch(`${BASE}/api/v1/profiles/user/${userId}`, { headers });
  check("GET profile", profile.ok, String(profile.status));

  const vehicles = await fetch(`${BASE}/api/v1/fleet/vehicles`, { headers });
  const vehiclesBody = await json(vehicles);
  const vehicleCount = (vehiclesBody?.data?.items ?? vehiclesBody?.items ?? vehiclesBody?.data ?? []).length;
  check("GET fleet/vehicles", vehicles.ok, `${vehicleCount} vehicles`);

  const devices = await fetch(`${BASE}/api/v1/fleet/devices`, { headers });
  check("GET fleet/devices", devices.ok, String(devices.status));

  const trips = await fetch(`${BASE}/api/v1/trips`, { headers });
  const tripsBody = await json(trips);
  const tripList = tripsBody?.data ?? tripsBody ?? [];
  check("GET trips", trips.ok, `${tripList.length} trips`);

  const tripId = tripList[0]?.id;
  if (tripId) {
    const tripDetail = await fetch(`${BASE}/api/v1/trips/${tripId}`, { headers });
    check("GET trip detail", tripDetail.ok, `id=${tripId}`);

    const patch = await fetch(`${BASE}/api/v1/trips/${tripId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ notes: "E2E local smoke test" }),
    });
    check("PATCH trip (US026)", patch.ok, String(patch.status));
  } else {
    check("GET trip detail", false, "no trips in seed");
    check("PATCH trip (US026)", false, "skipped");
  }

  const tracking = await fetch(`${BASE}/api/v1/trips/public/${TRACKING}`);
  check("GET trips/public/:code (US027)", tracking.ok, TRACKING);

  const alerts = await fetch(`${BASE}/api/v1/alerts`, { headers });
  const alertsBody = await json(alerts);
  const alertCount = (alertsBody?.data ?? alertsBody ?? []).length;
  check("GET alerts", alerts.ok, `${alertCount} alerts`);

  for (const path of ["/analytics/trips", "/analytics/alerts", "/analytics/incidents-by-month"]) {
    const r = await fetch(`${BASE}/api/v1${path}`, { headers });
    check(`GET ${path}`, r.ok, String(r.status));
  }

  const plans = await fetch(`${BASE}/api/v1/plans`, { headers });
  check("GET plans (billing)", plans.ok, String(plans.status));

  const sub = await fetch(`${BASE}/api/v1/subscription/user-id/${userId}`, { headers });
  check("GET subscription", sub.ok || sub.status === 404, String(sub.status));

  const payments = await fetch(`${BASE}/api/v1/payments/user-id/${userId}`, { headers });
  check("GET payments", payments.ok, String(payments.status));

  const deviceToken = await fetch(`${BASE}/api/v1/device-tokens`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId: Number(userId),
      token: "e2e-local-fcm-token-simulator",
      platform: "ios",
    }),
  });
  check("POST device-tokens", deviceToken.ok, String(deviceToken.status));

  if (tripId) {
    const sessions = await fetch(`${BASE}/api/v1/monitoring/sessions/trip/${tripId}`, { headers });
    const sessionsBody = await json(sessions);
    const sessionId = sessionsBody?.id ?? sessionsBody?.item?.id;
    if (sessionId) {
      const telemetry = await fetch(`${BASE}/api/v1/telemetry/session/${sessionId}`, { headers });
      check("GET telemetry/session/:id", telemetry.ok, String(telemetry.status));
    } else {
      check("GET telemetry/session/:id", false, "no monitoring session");
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n---");
  console.log(`E2E local: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failed:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
} catch (error) {
  console.error("E2E aborted:", error.message);
  process.exit(1);
}
