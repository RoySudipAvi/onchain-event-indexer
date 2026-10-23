import { createPublicClient, createWalletClient, http, custom } from "viem";
import { anvil } from "viem/chains";

const chain = import.meta.env.VITE_CHAIN;
const publicClient = createPublicClient({
  chain: chain,
  transport: http(import.meta.env.VITE_RPC_URL),
});

let walletClient;
if (window.ethereum) {
  const wallet = createWalletClient({
    chain: chain,
    transport: custom(window.ethereum!),
  });
  walletClient = wallet;
}

export { publicClient, walletClient };
