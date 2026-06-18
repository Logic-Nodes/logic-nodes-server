import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import api from "./shared/interfaces/http/router.js";
import swaggerRoutes from "./shared/interfaces/http/swagger.routes.js";
import { errorHandler } from "./shared/interfaces/http/error-handler.js";
import { env } from "./shared/config/env.js";

const buildCorsOptions = () => {
  if (env.cors.origins.length === 0) {
    return {};
  }

  return {
    origin: (origin, callback) => {
      if (!origin || env.cors.origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  };
};

export const buildApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.use(swaggerRoutes);
  app.use(api);
  app.use(errorHandler);

  return app;
};
