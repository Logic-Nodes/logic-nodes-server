import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { alertsSummary, incidentsByMonth, tripDetail, tripsSummary } from "../../application/analytics-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/trips", handle(async () => await tripsSummary()));
router.get("/trips/:id", handle(async (req) => await tripDetail(req.params.id)));
router.get("/alerts", handle(async () => await alertsSummary()));
router.get("/incidents-by-month", handle(async () => await incidentsByMonth()));

export default router;
