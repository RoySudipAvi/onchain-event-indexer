import express from "express";
import type { Express } from "express";
import { router } from "./routes.ts";
import cors from "cors";
import { poller } from "./polling.ts";
import { config } from "./config.ts";

const app: Express = express();
if (config.trustProxy) app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api", router);

poller();

export const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`app listening on port ${config.port}`);
});
