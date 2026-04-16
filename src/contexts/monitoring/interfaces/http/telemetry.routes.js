import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { createTelemetryData, deleteTelemetryData, getTelemetryData, listTelemetryBySession } from "../../application/monitoring-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.post("/", handle(async (req) => ({ item: await createTelemetryData(req.body || {}) }), 201));
router.get("/session/:sessionId", handle(async (req) => ({ items: await listTelemetryBySession(req.params.sessionId) })));
router.get("/:id", handle(async (req) => ({ item: await getTelemetryData(req.params.id) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteTelemetryData(req.params.id) })));

export default router;
