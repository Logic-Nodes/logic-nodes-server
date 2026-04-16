import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  createProfile,
	deleteProfile,
  getProfile,
  getProfileByUser,
  listProfiles,
  updateProfile
} from "../../application/profile-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
		sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/", handle(async () => ({ items: await listProfiles() })));
router.get("/user/:userId", handle(async (req) => ({ item: await getProfileByUser(req.params.userId) })));
router.get("/:id", handle(async (req) => ({ item: await getProfile(req.params.id) })));
router.post("/", handle(async (req) => ({ item: await createProfile(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateProfile(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteProfile(req.params.id) })));

export default router;
