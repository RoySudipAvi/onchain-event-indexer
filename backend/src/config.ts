import "dotenv/config";
import { createPublicClient, http, type PublicClient } from "viem";
import { anvil, sepolia } from "viem/chains";
import EventEmitter from "node:events";

export const eventEmitter = new EventEmitter();
const CHAINS = { anvil, sepolia } as const;

const chainName = process.env.CHAIN ?? "";
if (!Object.hasOwn(CHAINS, chainName)) {
  throw new Error(
    `Unknown CHAIN "${chainName}". Use one of: ${Object.keys(CHAINS).join(", ")}`,
  );
}
const chain = CHAINS[chainName as keyof typeof CHAINS];

const rpc_url = process.env.RPC_URL;
if (!rpc_url) throw new Error("RPC_URL is not set");

const positiveInt = (name: string): number => {
  const raw = process.env[name];
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return n;
};

const startBlock = BigInt(positiveInt("START_BLOCK"));
const chunkSize = BigInt(positiveInt("CHUNK_SIZE"));
const pollIntervalMs = positiveInt("POLL_INTERVAL_MS");

const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (corsOrigins.length === 0) throw new Error("CORS_ORIGIN is not set");

const port = positiveInt("PORT");

const cookieSameSite = process.env.COOKIE_SAMESITE ?? "lax";
if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error(
    `COOKIE_SAMESITE must be lax, strict or none, got "${cookieSameSite}"`,
  );
}
const cookieSecure = process.env.COOKIE_SECURE === "true";
if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true");
}
const trustProxy = process.env.TRUST_PROXY === "true";

const publicClient: PublicClient = createPublicClient({
  chain: chain,
  transport: http(rpc_url),
});

export const config = {
  chain: chain,
  rpc_url: rpc_url,
  poll_interval_ms: pollIntervalMs,
  fresh_state: startBlock,
  publicClient: publicClient,
  chunkSize: chunkSize,
  corsOrigins,
  port,
  cookieSameSite: cookieSameSite as "lax" | "strict" | "none",
  cookieSecure,
  trustProxy,
};
