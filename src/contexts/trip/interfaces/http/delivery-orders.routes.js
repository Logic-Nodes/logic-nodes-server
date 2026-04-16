import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  createDeliveryOrder,
	deleteDeliveryOrder,
  listDeliveryOrders,
	listDeliveryOrdersByTrip,
	markDeliveryOrderDelivered,
	updateDeliveryOrder
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

router.get("/", handle(async () => ({ items: await listDeliveryOrders() })));
router.get("/trip/:tripId", handle(async (req) => ({ items: await listDeliveryOrdersByTrip(req.params.tripId) })));
router.post("/:id/delivery", handle(async (req) => {
	await markDeliveryOrderDelivered(req.params.id);
	return undefined;
}));

router.post("/", handle(async (req) => ({ item: await createDeliveryOrder(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateDeliveryOrder(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteDeliveryOrder(req.params.id) })));

export default router;
