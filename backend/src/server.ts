import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { router } from "./routes.ts";
import cors from "cors";
import { poller } from "./polling.ts";
import { config } from "./config.ts";

const app: Express = express();
if (config.trustProxy) app.set("trust proxy", 1);
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api", router);
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ msg: "Internal server error" });
});

poller();

export const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`app listening on port ${config.port}`);
});
