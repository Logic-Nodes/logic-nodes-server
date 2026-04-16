import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { createNotification, listNotificationsByAlert, sendNotificationNow } from "../../application/alert-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/alert/:alertId", handle(async (req) => ({ items: await listNotificationsByAlert(req.params.alertId) })));
router.post("/", handle(async (req) => ({ item: await createNotification(req.body || {}) }), 201));
router.post("/:notificationId/send", handle(async (req) => ({ item: await sendNotificationNow(req.params.notificationId) })));

export default router;
