/*
 * OmniTrack - ESP32 telemetry node
 * -------------------------------------------------------------------------
 * Sends temperature/humidity (DHT22) + a vibration proxy (potentiometer) to
 * the OmniTrack backend over HTTPS and lights an LED when the backend replies
 * that the reading raised an alert.
 *
 * Backend endpoint:  POST {API_BASE}/api/v1/iot/telemetry
 * Auth:              headers x-device-imei + x-device-secret
 *
 * Libraries (Arduino Library Manager):
 *   - "DHT sensor library" by Adafruit
 *   - "Adafruit Unified Sensor"
 *   - "ArduinoJson" by Benoit Blanchon
 *
 * Wiring (see diagram.json for the Wokwi layout):
 *   DHT22 DATA  -> GPIO 15
 *   Potentiometer wiper (SIG) -> GPIO 34 (ADC1)
 *   LED anode   -> GPIO 2 (built-in LED works too)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ------------------------- CONFIG: EDIT THESE ----------------------------
const char *WIFI_SSID = "Wokwi-GUEST";   // On Wokwi use "Wokwi-GUEST" / no password
const char *WIFI_PASS = "";

// Production API on Render (HTTPS). For a local server use e.g.
//   "http://192.168.1.20:3000" and switch to WiFiClient (see note below).
const char *API_BASE = "https://logic-nodes-server.onrender.com";

// Credentials for THIS device. Register the device first and copy the secret
// returned once (see iot/esp32/README.md).
const char *DEVICE_IMEI = "ESP32-DEMO-0001";
const char *DEVICE_SECRET = "PASTE_DEVICE_SECRET_HERE";

// Optional: open/attach a monitoring session for this trip when the device has
// none active. Set to "" (empty) to require an existing session instead.
const char *TRIP_ID = "1";

const unsigned long SEND_INTERVAL_MS = 10000; // 10s between samples
// -------------------------------------------------------------------------

#define DHT_PIN 15
#define DHT_TYPE DHT22
#define POT_PIN 34
#define LED_PIN 2

DHT dht(DHT_PIN, DHT_TYPE);

void connectWifi() {
  Serial.printf("Connecting to WiFi '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.printf("\nWiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
}

// Maps the 12-bit ADC reading (0..4095) to a 0..10 "vibration" scale so the
// potentiometer can simulate mechanical vibration for the demo.
float readVibration() {
  int raw = analogRead(POT_PIN);
  return (raw / 4095.0f) * 10.0f;
}

bool postTelemetry(float temperature, float humidity, float vibration) {
  WiFiClientSecure client;
  client.setInsecure(); // Skip cert validation (fine for the academic demo / Wokwi).

  HTTPClient http;
  String url = String(API_BASE) + "/api/v1/iot/telemetry";
  if (!http.begin(client, url)) {
    Serial.println("Unable to begin HTTP request");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-imei", DEVICE_IMEI);
  http.addHeader("x-device-secret", DEVICE_SECRET);

  StaticJsonDocument<256> doc;
  doc["imei"] = DEVICE_IMEI;
  if (strlen(TRIP_ID) > 0) {
    doc["tripId"] = TRIP_ID;
  }
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["vibration"] = vibration;

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);
  String response = http.getString();
  Serial.printf("POST /iot/telemetry -> %d\n", status);

  bool hasAlert = false;
  if (status == 201) {
    StaticJsonDocument<1024> resDoc;
    DeserializationError err = deserializeJson(resDoc, response);
    if (!err) {
      JsonArray alerts = resDoc["alerts"].as<JsonArray>();
      hasAlert = !alerts.isNull() && alerts.size() > 0;
    }
  } else {
    Serial.printf("Body: %s\n", response.c_str());
  }

  http.end();
  return hasAlert;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);
  dht.begin();
  connectWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float vibration = readVibration();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed, retrying...");
    delay(2000);
    return;
  }

  Serial.printf("T=%.1f C  H=%.1f %%  Vib=%.2f\n", temperature, humidity, vibration);

  bool alertRaised = postTelemetry(temperature, humidity, vibration);
  digitalWrite(LED_PIN, alertRaised ? HIGH : LOW);

  delay(SEND_INTERVAL_MS);
}
