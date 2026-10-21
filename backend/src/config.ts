import "dotenv/config";
import { createPublicClient, http, type PublicClient } from "viem";
import { anvil, sepolia } from "viem/chains";
import EventEmitter from "node:events";

export const eventEmitter = new EventEmitter();
const rpc_url = process.env.ANVIL_RPC_URL;
const publicClient: PublicClient = createPublicClient({
  chain: anvil,
  transport: http(rpc_url),
});
export const config = {
  rpc_url: rpc_url,
  poll_interval_ms: 15000,
  fresh_state: 0n,
  publicClient: publicClient,
};
