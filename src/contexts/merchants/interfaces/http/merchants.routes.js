import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  addEmployee,
  createMerchant,
	deleteMerchant,
  getMerchant,
	listMerchants,
	updateMerchant
} from "../../application/merchant-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/", handle(async () => ({ items: await listMerchants() })));
router.get("/:id", handle(async (req) => ({ item: await getMerchant(req.params.id) })));
router.post("/", handle(async (req) => ({ item: await createMerchant(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateMerchant(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteMerchant(req.params.id) })));
router.post("/:id/employee", handle(async (req) => {
	await addEmployee(req.params.id, req.body?.userId);
	return undefined;
}, 201));

export default router;
