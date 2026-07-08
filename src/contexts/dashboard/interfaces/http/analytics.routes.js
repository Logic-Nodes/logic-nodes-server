import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  alertsDashboard,
  alertsSummary,
  incidentsByMonth,
  tripDetail,
  tripsDashboard,
  tripsSummary
} from "../../application/analytics-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/trips/summary", handle(async () => await tripsSummary()));
router.get("/trips", handle(async () => ({ items: await tripsDashboard() })));
router.get("/trips/:id", handle(async (req) => ({ item: await tripDetail(req.params.id) })));
router.get("/alerts/summary", handle(async () => await alertsSummary()));
router.get("/alerts", handle(async (req) => ({ items: await alertsDashboard(req.query.tripId) })));
router.get("/incidents-by-month", handle(async () => ({ items: await incidentsByMonth() })));

export default router;
