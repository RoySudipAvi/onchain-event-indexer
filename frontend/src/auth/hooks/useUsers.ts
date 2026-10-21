import { walletClient } from "../../config/client";
import { useState, useEffect } from "react";
import { type Address } from "viem";

const noWallet = (): boolean => {
  if (!window.ethereum) {
    alert("No wallet found!!!");
    return true;
  }
  return false;
};

type Cb = (accounts: string[]) => void;
const g = globalThis as any;
const subs: Set<Cb> = (g.__accountSubs ??= new Set());

export function subscribeAccounts(cb: Cb) {
  if (!g.__accountsHooked && window.ethereum) {
    g.__accountsHooked = true;
    window.ethereum.on("accountsChanged", (a: string[]) =>
      g.__accountSubs.forEach((fn: Cb) => fn(a)),
    );
  }
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

const onAccountsChanged = (accounts: string[]) => {
  console.log("account changed: ", accounts);
};

export const useUsers = () => {
  const [account, setAccount] = useState<Address | null>(null);
  useEffect(() => {
    if (noWallet()) return;
    console.log(window.ethereum.on === window.ethereum.addListener);
    console.log(window.ethereum.removeListener.toString());
    console.log(window.ethereum.on.toString());
    const onChainChanged = (chainId: string) => {
      console.log("chain changed: ", chainId);
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);

    console.log(window.ethereum.listenerCount("accountsChanged"));

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
    };
  }, []);

  useEffect(() => {
    if (noWallet()) return;
    const controller = new AbortController();
    const getAddress = async () => {
      try {
        const [address] = await walletClient.getAddresses();
        if (controller.signal.aborted) return;
        if (address) {
          setAccount(address);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Wallet error:", e);
      }
    };
    getAddress();

    return () => {
      controller.abort();
    };
  }, []);

  const requestAddress = async (): void => {
    if (noWallet()) return;
    const [address] = await walletClient.requestAddresses();
    setAccount(address);
  };
  return { requestAddress, account };
};
