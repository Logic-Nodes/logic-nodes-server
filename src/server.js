import { buildApp } from "./app.js";
import { env } from "./shared/config/env.js";
import { startDisconnectionMonitor } from "./contexts/iot/application/disconnection-monitor.js";

const app = buildApp();

app.listen(env.port, () => {
  console.log(`LogicNodes Node API listening on port ${env.port}`);
  // Background worker that flags IoT devices offline and raises disconnection alerts.
  startDisconnectionMonitor();
});
