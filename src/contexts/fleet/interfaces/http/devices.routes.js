import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  createDevice,
  deleteDevice,
  getDevice,
  getDeviceByImei,
  listDevices,
  listDevicesByOnline,
  setDeviceOnlineStatus,
  updateDevice,
  updateDeviceFirmware
} from "../../application/fleet-service.js";

const router = Router();

const handle = (action, statusCode = 200) => async (req, res, next) => {
	try {
		const body = await action(req);
    sendHttpResponse(res, statusCode, body);
	} catch (error) {
		next(error);
	}
};

router.get("/", handle(async () => ({ items: await listDevices() })));
router.get("/by-imei/:imei", handle(async (req) => ({ item: await getDeviceByImei(req.params.imei) })));
router.get("/by-online/:online", handle(async (req) => ({ items: await listDevicesByOnline(req.params.online) })));
router.get("/:id", handle(async (req) => ({ item: await getDevice(req.params.id) })));
router.post("/", handle(async (req) => ({ item: await createDevice(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateDevice(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteDevice(req.params.id) })));
router.post("/:id/firmware", handle(async (req) => ({ item: await updateDeviceFirmware(req.params.id, req.body?.firmware) })));
router.patch("/:id/online", handle(async (req) => ({ item: await setDeviceOnlineStatus(req.params.id, req.body?.online) })));

export default router;
