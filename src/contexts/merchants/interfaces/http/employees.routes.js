import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  getEmployee,
	deleteEmployee,
  listEmployees,
  listEmployeesByMerchant
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

router.get("/", handle(async () => ({ items: await listEmployees() })));
router.get("/merchants/:merchantId", handle(async (req) => ({ items: await listEmployeesByMerchant(req.params.merchantId) })));
router.get("/:id", handle(async (req) => ({ item: await getEmployee(req.params.id) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteEmployee(req.params.id) })));

export default router;
