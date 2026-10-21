import express from "express";
import type { Express } from "express";
import { router } from "./routes.ts";
import cors from "cors";
import { poller } from "./polling.ts";

const app: Express = express();
const port = 3000;
const hostname = "localhost";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api", router);

poller();

export const server = app.listen(port, hostname, (error) => {
  if (error) {
    throw error;
  }
  console.log(`app listening on port ${port}`);
});
