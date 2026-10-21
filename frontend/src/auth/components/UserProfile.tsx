import { useConnection } from "wagmi";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  11155111: "Sepolia",
  84532: "Base Sepolia",
};

const shorten = (value: string, head = 6, tail = 4) =>
  value && value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;

const UserProfile = () => {
  const connection = useConnection();
  const chainName =
    CHAIN_NAMES[connection.chainId as number] ?? `Chain ${connection.chainId}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
      <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {chainName}
      </span>
      <code
        className="font-mono text-xs text-zinc-300"
        title={connection.address}
      >
        {connection.address && shorten(connection.address)}
      </code>
    </div>
  );
};

export default UserProfile;
