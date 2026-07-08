import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { heartbeat, ingestTelemetry } from "../../application/ingestion-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
  try {
    const body = await action(req);
    sendHttpResponse(res, statusCode, body);
  } catch (error) {
    next(error);
  }
};

// Devices authenticate with their IMEI + secret. The secret may travel in the
// `x-device-secret` header (preferred) or inside the JSON body.
const readCredentials = (req) => ({
  imei: req.body?.imei || req.header("x-device-imei") || null,
  deviceSecret: req.header("x-device-secret") || req.body?.deviceSecret || null
});

router.post("/telemetry", handle(async (req) => ({
  item: await ingestTelemetry({ ...(req.body || {}), ...readCredentials(req) })
}), 201));

router.post("/heartbeat", handle(async (req) => ({
  item: await heartbeat(readCredentials(req))
})));

export default router;
