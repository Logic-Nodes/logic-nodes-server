import { env } from "../../../shared/config/env.js";
import { findStaleOnlineDevices, markDeviceOffline } from "../../fleet/application/fleet-service.js";
import { raiseAlert } from "../../alerts/application/alert-service.js";

let timer = null;
let running = false;

/**
 * One sweep of the disconnection detector (US030 / B-11 / B-25):
 * any device that was online but stopped reporting within the configured
 * window is flipped offline and a DISCONNECTION alert is raised once.
 */
export const runDisconnectionSweep = async () => {
  const stale = await findStaleOnlineDevices(env.iot.offlineAfterSeconds);

  const results = [];
  for (const device of stale) {
    await markDeviceOffline(device.id);
    const lastSeen = device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : "never";
    const alert = await raiseAlert({
      deliveryOrderId: null,
      alertType: "DISCONNECTION",
      description: `Device ${device.imei} went offline (no telemetry since ${lastSeen}).`
    });
    results.push({ deviceId: device.id, imei: device.imei, alertId: alert.id });
  }

  return results;
};

export const startDisconnectionMonitor = () => {
  if (timer) {
    return timer;
  }

  const intervalMs = Math.max(5, Number(env.iot.monitorIntervalSeconds) || 30) * 1000;

  timer = setInterval(async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const results = await runDisconnectionSweep();
      if (results.length) {
        console.log(`[iot-monitor] flagged ${results.length} device(s) offline`);
      }
    } catch (error) {
      // Never let a transient DB error crash the process; just log and retry.
      console.warn(`[iot-monitor] sweep failed: ${error.message}`);
    } finally {
      running = false;
    }
  }, intervalMs);

  // Do not keep the event loop alive solely for this timer.
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  console.log(`[iot-monitor] started (interval ${intervalMs / 1000}s, offline after ${env.iot.offlineAfterSeconds}s)`);
  return timer;
};

export const stopDisconnectionMonitor = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
