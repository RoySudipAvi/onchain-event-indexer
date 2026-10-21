import { useConnect, useConnectors } from "wagmi";

const ConnectWallet = () => {
  const connect = useConnect();
  const connectors = useConnectors();

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
      <h3 className="text-lg font-semibold tracking-tight">
        Connect your wallet
      </h3>
      <p className="mt-1 text-sm text-zinc-400">Choose a wallet to continue.</p>

      <div className="mt-5 space-y-2">
        {connectors.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
            No wallet detected
          </div>
        )}
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            disabled={connect.isPending}
            onClick={() => connect.mutate({ connector })}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connector.icon && (
              <img src={connector.icon} alt="" className="h-5 w-5 rounded" />
            )}
            {connector.name}
          </button>
        ))}
      </div>

      {connect.isError && (
        <p className="mt-3 break-all text-sm text-red-400">
          {(connect.error as Error).message}
        </p>
      )}
    </div>
  );
};

export default ConnectWallet;
