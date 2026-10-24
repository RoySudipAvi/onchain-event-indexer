import { anvil, sepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

const CHAINS = { anvil, sepolia } as const;

const chainName = import.meta.env.VITE_CHAIN ?? "";
if (!Object.hasOwn(CHAINS, chainName)) {
  throw new Error(
    `Unknown VITE_CHAIN "${chainName}". Use one of: ${Object.keys(CHAINS).join(", ")}`,
  );
}
const chain = CHAINS[chainName as keyof typeof CHAINS];

export const config = createConfig({
  chains: [chain],
  transports: {
    [anvil.id]: http(import.meta.env.VITE_RPC_URL),
    [sepolia.id]: http(import.meta.env.VITE_RPC_URL),
  },
});
