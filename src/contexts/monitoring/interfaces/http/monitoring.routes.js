import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  createSession,
  endSession,
  getSession,
  deleteSession,
  listActiveSessions,
  listSessionsByTrip,
  pauseSession,
  resumeSession
} from "../../application/monitoring-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
    sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.post("/sessions", handle(async (req) => ({ item: await createSession(req.body || {}) }), 201));
router.post("/sessions/:sessionId/pause", handle(async (req) => ({ item: await pauseSession(req.params.sessionId) })));
router.post("/sessions/:sessionId/end", handle(async (req) => ({ item: await endSession(req.params.sessionId) })));
router.post("/sessions/:sessionId/resume", handle(async (req) => ({ item: await resumeSession(req.params.sessionId) })));
router.get("/sessions/active", handle(async () => ({ items: await listActiveSessions() })));
router.get("/sessions/:sessionId", handle(async (req) => ({ item: await getSession(req.params.sessionId) })));
router.get("/sessions/trip/:tripId", handle(async (req) => {
  const sessions = await listSessionsByTrip(req.params.tripId);
  return { item: sessions[0] || null };
}));
router.delete("/sessions/:sessionId", handle(async (req) => ({ item: await deleteSession(req.params.sessionId) })));

export default router;
