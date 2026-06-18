import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
	logout,
	logoutAll,
	refreshTokens,
	requestPasswordReset,
	resetPassword,
	signIn,
	signUp,
	verifyAccessToken
} from "../../application/authentication-service.js";

const handle = (action) => async (req, res, next) => {
	try {
		const result = (await action(req)) || {};
		const statusCode = result.statusCode || 200;
		const body = Object.prototype.hasOwnProperty.call(result, "body") ? result.body : result;
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

const router = Router();

router.post("/sign-in", handle(async (req) => ({ statusCode: 200, body: await signIn(req.body || {}) })));
router.post("/sign-up", handle(async (req) => ({ statusCode: 201, body: await signUp(req.body || {}) })));
router.post("/verify-token", handle(async (req) => ({ statusCode: 200, body: await verifyAccessToken({ authorization: req.headers.authorization, token: req.body?.token }) })));
router.post("/forgot-password", handle(async (req) => ({ statusCode: 200, body: await requestPasswordReset(req.body || {}) })));
router.post("/reset-password", handle(async (req) => ({ statusCode: 200, body: await resetPassword(req.body || {}) })));
router.post("/refresh", handle(async (req) => ({ statusCode: 200, body: await refreshTokens(req.body || {}) })));
router.post("/logout", handle(async (req) => ({ statusCode: 204, body: await logout(req.body || {}) })));
router.post("/logout-all", handle(async (req) => ({ statusCode: 204, body: await logoutAll({ authorization: req.headers.authorization, userId: req.body?.userId }) })));

export default router;
