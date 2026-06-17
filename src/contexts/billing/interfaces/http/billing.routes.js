import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  cancelSubscription,
  getOrCreateSubscription,
  linkPaymentMethod,
  listPayments
} from "../../application/billing-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
  try {
    const body = await action(req);
    sendHttpResponse(res, statusCode, body);
  } catch (error) {
    next(error);
  }
};

router.get("/:userId/subscription", handle(async (req) => ({ item: await getOrCreateSubscription(req.params.userId) })));
router.get("/:userId/payments", handle(async (req) => ({ items: await listPayments(req.params.userId) })));
router.post("/:userId/payment-method", handle(async (req) => ({ item: await linkPaymentMethod(req.params.userId, req.body || {}) })));
router.post("/:userId/cancel", handle(async (req) => ({ item: await cancelSubscription(req.params.userId) })));

export default router;
