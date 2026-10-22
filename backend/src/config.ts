import "dotenv/config";
import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import EventEmitter from "node:events";

export const eventEmitter = new EventEmitter();
const rpc_url = process.env.RPC_URL;
const chain = process.env.CHAIN;
const startBlock = BigInt(process.env.START_BLOCK);
const chunkSize = BigInt(process.env.CHUNK_SIZE);

if (!rpc_url) throw new Error("RPC_URL is not set");
if (!startBlock || !chunkSize) throw new Error("Poller configuration missing");

const publicClient: PublicClient = createPublicClient({
  chain: chain,
  transport: http(rpc_url),
});

export const config = {
  chain: chain,
  rpc_url: rpc_url,
  poll_interval_ms: process.env.POLL_INTERVAL_MS,
  fresh_state: startBlock,
  publicClient: publicClient,
  chunkSize: chunkSize,
};
