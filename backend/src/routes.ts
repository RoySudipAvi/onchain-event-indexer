import "dotenv/config";
import { Router } from "express";
import type { Request, Response } from "express";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import {
  watchedAddressList,
  addAddressToWatch,
  deleteWatchedAddress,
  getEvents,
  isEventSortBy,
} from "./repositories.ts";
import { isAddress } from "viem";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";
import { config } from "./config.ts";
import { requireAuth } from "./auth.ts";

declare module "express-session" {
  interface SessionData {
    nonce?: string;
    siwe?: { address: Address; chainId: number };
  }
}

const DOMAIN = process.env.CLIENT_DOMAIN;
const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect().catch(console.error);
const store = new RedisStore({ client: redisClient, prefix: "sess:" });
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.cookieSecure,
  },
});
export const router = Router({ caseSensitive: true, strict: true });
router.use(sessionMiddleware);

router.get(
  "/watched-addresses",
  requireAuth,
  async (req: Request, res: Response) => {
    const list = await watchedAddressList(req.userAddress);
    res.send(list);
  },
);
router.post(
  "/watch-address",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.session.siwe) return res.status(401).end();
    if (!isAddress(req.body.address)) {
      return res.status(400).json({
        msg: "Invalid Ethereum address provided, check the length or format",
      });
    }
    const row = { ...req.body, watched_by: req.userAddress };
    const returned = await addAddressToWatch(row);
    return res.status(returned.status).json({ msg: returned.msg });
  },
);
router.delete(
  "/delete-watched-address/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const returned = await deleteWatchedAddress(req.params.id, req.userAddress);
    return res.status(returned.status).json({ msg: returned.msg });
  },
);

router.get("/feed", requireAuth, async (req: Request, res: Response) => {
  console.log(typeof req.query.filters);
  let filters = { contract: "", eventName: "", wallet: "" };
  if (req.query.filters) {
    try {
      filters = JSON.parse(req.query.filters);
    } catch (error) {
      console.log("error msg: ", error);
    }
  }
  console.log("filters: ", filters);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const sortBy = isEventSortBy(req.query.sortBy) ? req.query.sortBy : "id";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
  const events = await getEvents(
    req.userAddress,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  );
  const eventData = events.res.map((event) => ({
    blockNumber: event.blockNumber.toString(),
    txHash: event.txHash,
    contract: event.contract,
    eventName: event.eventName,
    args: JSON.stringify(event.args),
    indexedAt: event.indexedAt,
  }));
  res.send({ count: events.count, res: eventData, hasMore: events.hasMore });
});

router.get("/siwe/getNonce", async (req: Request, res: Response) => {
  const nonce = generateSiweNonce();
  req.session.nonce = nonce;
  res.json({ nonce });
});

router.post("/siwe/verify", async (req: Request, res: Response) => {
  const nonce = req.session.nonce;
  req.session.nonce = undefined;
  if (!nonce) return res.status(400).json({ error: "No nonce issued" });
  const { message, signature } = req.body ?? {};

  if (typeof message !== "string") {
    return res.status(400).json({ error: "Malformed request" });
  }
  const fields = parseSiweMessage(message);
  if (!fields.address || !fields.chainId) {
    return res.status(400).json({ error: "Malformed message" });
  }
  let valid = false;
  try {
    valid = await config.publicClient.verifySiweMessage({
      address: fields.address,
      message: message,
      signature: signature,
      domain: DOMAIN,
      nonce: nonce,
    });
  } catch (err) {
    console.error("siwe verify error:", err);
    return res.status(500).json({ error: "Could not verify signature" });
  }
  if (!valid) return res.status(401).json({ error: "Invalid signature" });
  const siwe = { address: fields.address, chainId: fields.chainId };
  req.session.regenerate((err) => {
    if (err) {
      console.error("session regenerate error:", err);
      return res.status(500).json({ error: "Could not create session" });
    }
    req.session.siwe = siwe;
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("session save error:", saveErr);
        return res.status(500).json({ error: "Could not create session" });
      }
      res.json({ ok: true, address: siwe.address });
    });
  });
});

router.get("/siwe/me", (req: Request, res: Response) => {
  if (!req.session.siwe) return res.status(401).end();
  res.json(req.session.siwe);
});

router.post("/siwe/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});
