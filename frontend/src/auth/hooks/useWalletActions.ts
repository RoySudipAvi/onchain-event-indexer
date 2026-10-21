import { watchConnection, watchChainId } from "wagmi/actions";
import { useConfig } from "wagmi";
import { useEffect, useState } from "react";

export const useWalletActions = () => {
  const [currentConnection, setCurrentConnection] = useState();
  const [currentChain, setCurrentChain] = useState();
  const config = useConfig();
  useEffect(() => {
    const watchAccount = watchConnection(config, {
      onChange(connection, prevConnection) {
        if (!prevConnection) return;
        if (connection.address !== prevConnection.address) {
          console.log(
            `connection changed from ${prevConnection.address} to ${connection.address}`,
          );
          setCurrentConnection(currentConnection);
        }
      },
    });

    const watchChain = watchChainId(config, {
      onChange(chainId, prevChainId) {
        console.log(`chain id changed from ${prevChainId} to ${chainId}`);
        setCurrentChain(chainId);
      },
    });

    return () => {
      watchAccount();
      watchChain();
    };
  }, [config]);

  return { currentConnection };
};
