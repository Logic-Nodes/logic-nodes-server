import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  cancelSubscription,
  changePlan,
  getSubscriptionByUser,
  listPaymentsByUser,
  listPlans
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

// Contract (web + mobile), mounted at /api/v1:
//   GET    /plans
//   GET    /subscription/user-id/:userId
//   PUT    /subscription/:id/plan        body: { newPlanId }
//   DELETE /subscription/:id
//   GET    /payments/user-id/:userId
router.get("/plans", handle(async () => ({ items: await listPlans() })));
router.get("/subscription/user-id/:userId", handle(async (req) => ({ item: await getSubscriptionByUser(req.params.userId) })));
router.put("/subscription/:id/plan", handle(async (req) => ({ item: await changePlan(req.params.id, req.body || {}) })));
router.delete("/subscription/:id", handle(async (req) => ({ item: await cancelSubscription(req.params.id) })));
router.get("/payments/user-id/:userId", handle(async (req) => ({ items: await listPaymentsByUser(req.params.userId) })));

export default router;
