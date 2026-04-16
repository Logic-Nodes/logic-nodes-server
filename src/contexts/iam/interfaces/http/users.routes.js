import { Router } from "express";

import { getIamUsers } from "../../application/authentication-service.js";

const router = Router();

router.get("/", async (req, res, next) => {
	try {
		const users = await getIamUsers();
		res.status(200).json(users);
	} catch (error) {
		next(error);
	}
});

router.get("/:userId", async (req, res, next) => {
	try {
		const users = await getIamUsers();
		const user = users.find((entry) => String(entry.id) === String(req.params.userId)) || null;
		if (!user) {
			res.status(404).end();
			return;
		}
		res.status(200).json(user);
	} catch (error) {
		next(error);
	}
});

export default router;
