import { buildApp } from "./app.js";
import { env } from "./shared/config/env.js";
import { startDisconnectionMonitor } from "./contexts/iot/application/disconnection-monitor.js";
import { startBackgroundJobs } from "./shared/infrastructure/jobs/start-jobs.js";
import { startMqttSubscriber } from "./shared/infrastructure/mqtt/mqtt-subscriber.js";

const app = buildApp();

app.listen(env.port, () => {
  console.log(`LogicNodes Node API listening on port ${env.port}`);
  // IoT offline detection (main): marks devices offline + DISCONNECTION alerts.
  startDisconnectionMonitor();
  // Billing renewal notifications; disconnect job omitted (handled above).
  startBackgroundJobs();
  startMqttSubscriber();
});
