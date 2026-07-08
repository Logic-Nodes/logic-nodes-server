# OmniTrack — ESP32 IoT integration

How the ESP32 (DHT22 + potentiometer + LED) connects to the OmniTrack backend
and streams telemetry that the API persists, evaluates and turns into alerts.

Chosen transport: **HTTPS ingest** (the device does an authenticated `POST`).
No MQTT broker is required, so it runs on the current Render deployment as-is.

---

## 1. Data flow

```
ESP32 ──HTTPS POST──▶ /api/v1/iot/telemetry
   │  headers: x-device-imei, x-device-secret
   │  body: { temperature, humidity, vibration, tripId? }
   ▼
Backend:
  1. verify device credentials (devices.device_secret)
  2. mark device online + refresh last_seen_at
  3. resolve/open an ACTIVE monitoring session for the device
  4. store the sample in telemetry_data
  5. evaluate thresholds → auto-create alerts (TEMPERATURE / HUMIDITY / VIBRATION)
  6. respond 201 with { telemetry, alerts, sessionId, ... }
   ▼
ESP32 lights the LED when the response contains alerts.

Meanwhile a background worker flips devices offline and raises a DISCONNECTION
alert if no telemetry arrives within IOT_OFFLINE_AFTER_SECONDS.
```

This reuses the existing `monitoring_sessions` / `telemetry_data` / `alerts`
tables, so the mobile and web apps read the live data through the endpoints they
already use (`GET /api/v1/telemetry/session/:id`, `GET /api/v1/alerts`, ...).

---

## 2. One-time backend setup

1. Apply the schema additions (idempotent, safe on the Render production DB):

   ```bash
   psql "$DATABASE_URL" -f db/iot.sql
   ```

   Adds `devices.device_secret`, `devices.last_seen_at`, `trips.tracking_code`,
   `trips.scheduled_at` and the `DISCONNECTION` alert type.

2. (Optional) tune ingest behaviour via env vars — see `.env.example`:
   `IOT_OFFLINE_AFTER_SECONDS`, `IOT_MONITOR_INTERVAL_SECONDS`,
   `IOT_MIN/MAX_TEMPERATURE`, `IOT_MIN/MAX_HUMIDITY`, `IOT_MAX_VIBRATION`.

---

## 3. Register the device (get its secret)

Create the device — the secret is returned **once** in the response:

```bash
curl -X POST https://logic-nodes-server.onrender.com/api/v1/fleet/devices \
  -H "Content-Type: application/json" \
  -d '{ "imei": "ESP32-DEMO-0001", "firmware": "1.0.0" }'
# => { "id": 1, "imei": "ESP32-DEMO-0001", ..., "deviceSecret": "a1b2c3..." }
```

Lost it? Rotate to get a new one:

```bash
curl -X POST https://logic-nodes-server.onrender.com/api/v1/fleet/devices/by-imei/ESP32-DEMO-0001/rotate-secret
```

Copy `imei` and `deviceSecret` into `omnitrack_esp32.ino`.

---

## 4. Flash / simulate the ESP32

- **Wokwi:** open `diagram.json` + `omnitrack_esp32.ino`, keep `WIFI_SSID="Wokwi-GUEST"`.
- **Real board:** install the libraries listed at the top of the sketch, set your
  Wi‑Fi credentials, then upload.

Wiring: DHT22 data → GPIO15, potentiometer wiper → GPIO34, LED → GPIO2.
The potentiometer stands in for a vibration sensor (mapped to 0–10).

---

## 5. Test the ingest without hardware

```bash
curl -X POST https://logic-nodes-server.onrender.com/api/v1/iot/telemetry \
  -H "Content-Type: application/json" \
  -H "x-device-imei: ESP32-DEMO-0001" \
  -H "x-device-secret: PASTE_SECRET" \
  -d '{ "tripId": 1, "temperature": 14.2, "humidity": 55, "vibration": 1.1 }'
```

- `temperature: 14.2` with default `IOT_MAX_TEMPERATURE=8` → a `TEMPERATURE`
  alert is created and returned in `alerts` (the LED turns on).
- Send an in-range reading and the alert stops being re-created (it stays open
  until acknowledged), matching the mobile alert screens.

Heartbeat only (keep-alive, no reading):

```bash
curl -X POST https://logic-nodes-server.onrender.com/api/v1/iot/heartbeat \
  -H "x-device-imei: ESP32-DEMO-0001" -H "x-device-secret: PASTE_SECRET"
```

---

## 6. Endpoints added

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/iot/telemetry` | Authenticated telemetry ingest + threshold alerts |
| POST | `/api/v1/iot/heartbeat` | Liveness ping (keeps device online) |
| POST | `/api/v1/fleet/devices/by-imei/:imei/rotate-secret` | Rotate a device secret |

Thresholds come from the trip's delivery orders when present, otherwise from the
`IOT_*` env defaults.
