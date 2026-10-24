import { useState } from "react";
import { useWatchedAddresses } from "../hooks/useWatchedAddresses";
import { useAddAddressToWatch } from "../hooks/useAddAddressToWatch";
import { useDeleteWatchedAddress } from "../hooks/useDeleteWatchedAddress";
import type { Address } from "viem";
import { isAddress, getAddress } from "viem";

type WatchedAddress = {
  id: number;
  address: string;
  label: string | null;
};
const WatchedAddresses = () => {
  const [newAddress, setNewAddress] = useState<Address | null>(null);
  const [newLabel, setNewLabel] = useState<string | null>(null);
  const [invalidAddress, setInvaliAddress] = useState<string | null>(null);
  const { data, error, isPending, isError } = useWatchedAddresses();
  const {
    mutate,
    reset: addReset,
    isPending: isAddPending,
    isError: isAddError,
    isSuccess: isAddSuccess,
    error: addError,
  } = useAddAddressToWatch();

  const { mutate: mutataDelete } = useDeleteWatchedAddress();

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  const handleSubmit = (address: Address | null, label: string | null) => {
    if (!address || !isAddress(address)) {
      setInvaliAddress(
        "Invalid Ethereum address provided, check the length or format",
      );
      return false;
    }
    setInvaliAddress(null);
    const checkSummedAddress = getAddress(address);
    const payload = { label: label ?? "", address: checkSummedAddress };
    mutate(payload, {
      onSuccess: () => {
        setNewLabel(null);
        setNewAddress(null);
      },
    });
  };

  const handleDelete = (id: number) => {
    const payload = { id: id };
    mutataDelete(payload);
  };
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
        <h3 className="mb-6 text-xl font-semibold">Watched Address List</h3>
        <div className="mb-6">
          {data.count > 0 ? (
            <ul className="space-y-2">
              {data.res.map((item: WatchedAddress) => (
                <li
                  className="flex items-start justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3"
                  key={item.address}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-1 text-sm text-zinc-400 break-all">
                      {item.address}
                    </div>
                  </div>
                  <button
                    className="rounded-md p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete address"
                    onClick={() => handleDelete(item.id)}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
              No data found
            </div>
          )}
        </div>
        <div className="space-y-3">
          <input
            type="text"
            onChange={(e) => {
              setNewLabel(e.target.value);
              addReset();
            }}
            value={newLabel ?? ""}
            placeholder="Label"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-zinc-500"
          />

          <input
            type="text"
            onChange={(e) => {
              setNewAddress(e.target.value as Address);
              addReset();
            }}
            value={newAddress ?? ""}
            placeholder="0x..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-zinc-500"
          />
          {invalidAddress && (
            <p className="text-sm text-red-400 break-all">{invalidAddress}</p>
          )}

          {isAddError && (
            <p className="text-sm text-red-400 break-all">
              {(addError as Error).message}
            </p>
          )}
          {isAddSuccess && (
            <p className="text-sm text-green-400 break-all">
              Address added successfully
            </p>
          )}
          <button
            onClick={() => handleSubmit(newAddress, newLabel)}
            disabled={isAddPending || !newAddress}
            className="w-full rounded-lg px-4 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          >
            {isAddPending ? "Adding..." : "Add Address"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WatchedAddresses;
