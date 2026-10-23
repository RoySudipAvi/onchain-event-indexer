import { anvil, baseSepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
const chain = import.meta.env.VITE_CHAIN;
const chain_id = chain.id;
export const config = createConfig({
  chains: [chain],
  transports: {
    [chain_id]: http(import.meta.env.VITE_RPC_URL),
  },
});
