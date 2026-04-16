import { Router } from "express";

import { sendHttpResponse } from "../../../../shared/interfaces/http/normalize-response.js";
import {
  assignDevice,
  changeVehicleStatus,
  createVehicle,
  deleteVehicle,
  getVehicle,
  getVehicleByPlate,
  listVehicles,
  listVehiclesByStatus,
  listVehiclesByType,
  unassignDevice,
  updateVehicle
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

router.get("/", handle(async () => ({ items: await listVehicles() })));
router.get("/by-plate/:plate", handle(async (req) => ({ item: await getVehicleByPlate(req.params.plate) })));
router.get("/by-status/:status", handle(async (req) => ({ items: await listVehiclesByStatus(req.params.status) })));
router.get("/by-type/:type", handle(async (req) => ({ items: await listVehiclesByType(req.params.type) })));
router.get("/:id", handle(async (req) => ({ item: await getVehicle(req.params.id) })));
router.post("/", handle(async (req) => ({ item: await createVehicle(req.body || {}) }), 201));
router.put("/:id", handle(async (req) => ({ item: await updateVehicle(req.params.id, req.body || {}) })));
router.delete("/:id", handle(async (req) => ({ item: await deleteVehicle(req.params.id) })));
router.post("/:id/assign-device/:imei", handle(async (req) => ({ item: await assignDevice(req.params.id, req.params.imei) })));
router.post("/:id/unassign-device/:imei", handle(async (req) => ({ item: await unassignDevice(req.params.id, req.params.imei) })));
router.patch("/:id/status", handle(async (req) => ({ item: await changeVehicleStatus(req.params.id, req.body?.status) })));

export default router;
