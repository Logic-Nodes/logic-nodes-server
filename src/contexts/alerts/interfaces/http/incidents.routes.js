import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { acknowledgeIncident, closeIncident, createIncident, listIncidentsByAlert } from "../../application/alert-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/alert/:alertId", handle(async (req) => ({ items: await listIncidentsByAlert(req.params.alertId) })));
router.post("/", handle(async (req) => ({ item: await createIncident(req.body || {}) }), 201));
router.patch("/:incidentId/acknowledgment", handle(async (req) => ({ item: await acknowledgeIncident(req.params.incidentId) })));
router.patch("/:incidentId/closure", handle(async (req) => ({ item: await closeIncident(req.params.incidentId) })));

export default router;
