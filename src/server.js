import { buildApp } from "./app.js";
import { env } from "./shared/config/env.js";

const app = buildApp();

app.listen(env.port, () => {
  console.log(`LogicNodes Node API listening on port ${env.port}`);
});
