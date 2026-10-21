import { createPublicClient, createWalletClient, http, custom } from "viem";
import { anvil } from "viem/chains";

const publicClient = createPublicClient({
  chain: anvil,
  transport: http("http://127.0.0.1:8545"),
});

let walletClient;
if (window.ethereum) {
  const wallet = createWalletClient({
    chain: anvil,
    transport: custom(window.ethereum!),
  });
  walletClient = wallet;
}

export { publicClient, walletClient };
