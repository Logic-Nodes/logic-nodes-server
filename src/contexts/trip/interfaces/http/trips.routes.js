import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  createTrip,
	deleteTrip,
  getTrip,
  getTripByTrackingCode,
  listTrips,
  listTripsByMerchant,
  searchTrips,
  updateTrip,
  updateTripStatus
} from "../../application/trip-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/", handle(async (req) => ({ items: await listTrips(req.query || {}) })));
router.get("/merchant/:merchantId", handle(async (req) => ({ items: await listTripsByMerchant(req.params.merchantId) })));
router.get("/search", handle(async (req) => ({ items: await searchTrips(req.query || {}) })));
router.get("/public/:code", handle(async (req) => ({ item: await getTripByTrackingCode(req.params.code) })));
router.get("/:tripId", handle(async (req) => ({ item: await getTrip(req.params.tripId) })));
router.post("/", handle(async (req) => {
	await createTrip(req.body || {});
	return undefined;
}, 201));
router.patch("/:tripId", handle(async (req) => ({ item: await updateTrip(req.params.tripId, req.body || {}) })));
router.post("/:tripId/start", handle(async (req) => {
	await updateTripStatus(req.params.tripId, "IN_PROGRESS");
	return undefined;
}));
router.post("/:tripId/complete", handle(async (req) => {
	await updateTripStatus(req.params.tripId, "COMPLETED");
	return undefined;
}));
router.delete("/:tripId", handle(async (req) => ({ item: await deleteTrip(req.params.tripId) })));

export default router;
