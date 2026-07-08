import { Router } from "express";

import alertsRoutes from "../../../contexts/alerts/interfaces/http/alerts.routes.js";
import incidentsRoutes from "../../../contexts/alerts/interfaces/http/incidents.routes.js";
import notificationsRoutes from "../../../contexts/alerts/interfaces/http/notifications.routes.js";
import billingRoutes from "../../../contexts/billing/interfaces/http/billing.routes.js";
import analyticsRoutes from "../../../contexts/dashboard/interfaces/http/analytics.routes.js";
import devicesRoutes from "../../../contexts/fleet/interfaces/http/devices.routes.js";
import vehiclesRoutes from "../../../contexts/fleet/interfaces/http/vehicles.routes.js";
import authenticationRoutes from "../../../contexts/iam/interfaces/http/authentication.routes.js";
import rolesRoutes from "../../../contexts/iam/interfaces/http/roles.routes.js";
import usersRoutes from "../../../contexts/iam/interfaces/http/users.routes.js";
import iotRoutes from "../../../contexts/iot/interfaces/http/iot.routes.js";
import employeesRoutes from "../../../contexts/merchants/interfaces/http/employees.routes.js";
import merchantsRoutes from "../../../contexts/merchants/interfaces/http/merchants.routes.js";
import monitoringRoutes from "../../../contexts/monitoring/interfaces/http/monitoring.routes.js";
import telemetryRoutes from "../../../contexts/monitoring/interfaces/http/telemetry.routes.js";
import profilesRoutes from "../../../contexts/profiles/interfaces/http/profiles.routes.js";
import deliveryOrdersRoutes from "../../../contexts/trip/interfaces/http/delivery-orders.routes.js";
import originPointsRoutes from "../../../contexts/trip/interfaces/http/origin-points.routes.js";
import tripsRoutes from "../../../contexts/trip/interfaces/http/trips.routes.js";
import deviceTokensRoutes from "../../../contexts/notifications/interfaces/http/device-tokens.routes.js";

const api = Router();

api.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

api.use("/api/v1/alerts", alertsRoutes);
api.use("/api/v1/incidents", incidentsRoutes);
api.use("/api/v1/notifications", notificationsRoutes);
api.use("/api/v1", billingRoutes);
api.use("/api/v1/analytics", analyticsRoutes);
api.use("/api/v1/fleet/devices", devicesRoutes);
api.use("/api/v1/fleet/vehicles", vehiclesRoutes);
api.use("/api/v1/authentication", authenticationRoutes);
api.use("/api/v1/roles", rolesRoutes);
api.use("/api/v1/users", usersRoutes);
api.use("/api/v1/employees", employeesRoutes);
api.use("/api/v1/merchants", merchantsRoutes);
api.use("/api/v1/monitoring", monitoringRoutes);
api.use("/api/v1/telemetry", telemetryRoutes);
api.use("/api/v1/iot", iotRoutes);
api.use("/api/v1/profiles", profilesRoutes);
api.use("/api/v1/delivery-orders", deliveryOrdersRoutes);
api.use("/api/v1/origin-points", originPointsRoutes);
api.use("/api/v1/trips", tripsRoutes);
api.use("/api/v1/device-tokens", deviceTokensRoutes);

export default api;
