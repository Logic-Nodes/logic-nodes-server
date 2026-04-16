import { Router } from "express";

import { getIamRoles } from "../../application/authentication-service.js";

const router = Router();

router.get("/", async (req, res, next) => {
	try {
		const roles = await getIamRoles();
		res.status(200).json(roles);
	} catch (error) {
		next(error);
	}
});

export default router;
