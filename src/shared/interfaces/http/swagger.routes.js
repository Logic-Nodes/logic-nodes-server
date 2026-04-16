import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { openApiSpec } from "./swagger-spec.js";

const router = Router();

router.get("/swagger.json", (req, res) => {
  res.json(openApiSpec);
});

router.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

export default router;
