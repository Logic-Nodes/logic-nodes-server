import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import { createOriginPoint, deleteOriginPoint, getOriginPoint, listOriginPoints, listOriginPointsByName, updateOriginPoint } from "../../application/trip-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/", handle(async () => ({ items: await listOriginPoints() })));
router.get("/search", handle(async (req) => ({ items: await listOriginPointsByName(req.query?.name || "") })));
router.get("/:id", handle(async (req) => ({ item: await getOriginPoint(req.params.id) })));
router.post("/", handle(async (req) => ({ item: await createOriginPoint(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateOriginPoint(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteOriginPoint(req.params.id) })));

export default router;
