import { anvil, baseSepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

export const config = createConfig({
  chains: [anvil, baseSepolia],
  transports: {
    [anvil]: http(import.meta.env.VITE_ANVIL_URL),
    [baseSepolia]: http(import.meta.env.VITE_BASE_SEPOLIA_URL),
  },
});
