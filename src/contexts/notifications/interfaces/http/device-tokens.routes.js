import { Router } from "express";

import { sendHttpResponse } from "../../../shared/interfaces/http/normalize-response.js";
import { registerDeviceToken } from "../../application/device-token-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
  try {
    const body = await action(req);
    sendHttpResponse(res, statusCode, body);
  } catch (error) {
    next(error);
  }
};

router.post("/", handle(async (req) => ({ item: await registerDeviceToken(req.body || {}) }), 201));

export default router;
