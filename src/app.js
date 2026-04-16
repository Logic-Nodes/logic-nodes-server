import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import api from "./shared/interfaces/http/router.js";
import { errorHandler } from "./shared/interfaces/http/error-handler.js";

export const buildApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.use(api);
  app.use(errorHandler);

  return app;
};
