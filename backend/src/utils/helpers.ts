import { isAddress, getAddress } from "viem";

export const ABI_REGISTRY = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event Deposit(address indexed dst, uint wad)",
  "event Withdrawal(address indexed src, uint wad)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
];

export const involvedAddresses = (
  args: unknown,
  watched: Set<string>,
): string[] => {
  if (!args || typeof args !== "object") return [];
  const found = new Set<string>();
  for (const v of Object.values(args)) {
    if (typeof v === "string" && isAddress(v, { strict: false })) {
      const a = getAddress(v);
      if (watched.has(a)) found.add(a);
    }
  }
  return [...found];
};
