import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  acknowledgeAlert,
  closeAlert,
  createAlert,
  getAlert,
  listAlerts,
  listAlertsByStatus,
  listAlertsByType
} from "../../application/alert-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
    sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.post("/", handle(async (req) => ({ item: await createAlert(req.body || {}) }), 201));
router.patch("/:alertId/acknowledgment", handle(async (req) => ({ item: await acknowledgeAlert(req.params.alertId) })));
router.patch("/:alertId/closure", handle(async (req) => ({ item: await closeAlert(req.params.alertId) })));
router.get("/", handle(async () => ({ items: await listAlerts() })));
router.get("/type/:type", handle(async (req) => ({ items: await listAlertsByType(req.params.type) })));
router.get("/status/:status", handle(async (req) => ({ items: await listAlertsByStatus(req.params.status) })));
router.get("/:alertId", handle(async (req) => ({ item: await getAlert(req.params.alertId) })));

export default router;
