import { useState, Fragment } from "react";
import { useEventLists } from "../hooks/useEventLists";
import { useWebSocket } from "../hooks/useWebSocket";
import type { EventSortBy, SortOrder } from "../../apis/api";

type FeedEvent = {
  blockNumber: string;
  txHash: string;
  logIndex: number;
  contract: string;
  eventName: string;
  args: string;
  indexedAt: string;
};
const COLUMNS: { label: string; sortKey?: EventSortBy }[] = [
  { label: "Block", sortKey: "blockNumber" },
  { label: "Event", sortKey: "eventName" },
  { label: "Contract", sortKey: "contract" },
  { label: "Transaction" },
  { label: "Args" },
  { label: "Indexed At", sortKey: "indexedAt" },
];

// Placeholder list for the dropdown. Later this can come from the API
// or from the same ABI registry the indexer decodes with.
const EVENT_OPTIONS = [
  "Transfer",
  "Approval",
  "ApprovalForAll",
  "Deposit",
  "Withdrawal",
  "Withdraw",
];

const shorten = (value: string, head = 6, tail = 4) =>
  value && value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;

const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500";
const buttonClass =
  "shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

const PersonalFeed = () => {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<EventSortBy>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterInputEvent, setFilterInputEvent] = useState("");
  const [filterInputContract, setFilterInputContract] = useState("");
  const [filterInputAddress, setFilterInputAddress] = useState("");
  const [eventsFilter, setEventsFilter] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, error, isPending, isError, isPlaceholderData, isFetching } =
    useEventLists(page, 10, sortBy, sortOrder, eventsFilter);
  useWebSocket();

  const handleSort = (key: EventSortBy) => {
    if (key === sortBy) {
      setSortOrder((old) => (old === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const toggleRow = (id: string) => {
    // If the user is selecting text (e.g. copying a hash), don't collapse the row.
    if (window.getSelection()?.toString()) return;
    setExpandedIds((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEventFilter = () => {
    const filters = {
      contract: filterInputContract,
      eventName: filterInputEvent,
      wallet: filterInputAddress,
    };
    setEventsFilter(JSON.stringify(filters));
    setPage(1);
  };

  if (isPending) return <p className="p-6 text-zinc-400">Loading...</p>;
  if (isError)
    return <p className="p-6 text-red-400">Error: {error.message}</p>;

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Feed</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {data.count} {data.count === 1 ? "event" : "events"} indexed
          </p>
        </div>
        <span
          className={`flex items-center gap-2 text-xs text-zinc-500 transition-opacity ${
            isFetching ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Updating…
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
        {/* Filters */}
        <div className="border-b border-zinc-800 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="contract-filter"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
              >
                Contract
              </label>
              <input
                id="contract-filter"
                type="text"
                value={filterInputContract}
                onChange={(e) => setFilterInputContract(e.target.value)}
                placeholder="0x… contract address"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="event-filter"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
              >
                Event
              </label>
              <select
                id="event-filter"
                value={filterInputEvent}
                onChange={(e) => setFilterInputEvent(e.target.value)}
                className={inputClass}
              >
                <option value="">All events</option>
                {EVENT_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="wallet-filter"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
              >
                Wallet
              </label>
              <input
                id="wallet-filter"
                type="text"
                value={filterInputAddress}
                onChange={(e) => setFilterInputAddress(e.target.value)}
                placeholder="0x… wallet address"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleEventFilter}
              className={buttonClass}
            >
              Filter
            </button>
          </div>
        </div>
        {/* Table */}
        <div
          className={`overflow-x-auto transition-opacity ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                {COLUMNS.map((col) => {
                  const isActive = col.sortKey === sortBy;
                  return (
                    <th
                      key={col.label}
                      className="px-6 py-3 font-semibold"
                      aria-sort={
                        col.sortKey
                          ? isActive
                            ? sortOrder === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                    >
                      {col.sortKey ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.sortKey!)}
                          className={`inline-flex items-center gap-1.5 uppercase tracking-wide transition hover:text-zinc-100 ${
                            isActive ? "text-zinc-100" : ""
                          }`}
                        >
                          {col.label}
                          <span
                            aria-hidden="true"
                            className={isActive ? "" : "text-zinc-600"}
                          >
                            {isActive ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {data.count > 0 ? (
              <tbody className="divide-y divide-zinc-800">
                {data.res.map((log: FeedEvent) => {
                  const rowId = `${log.txHash}:${log.logIndex}`;
                  const isExpanded = expandedIds.has(rowId);
                  const parsedArgs = JSON.parse(log.args);

                  return (
                    <Fragment key={rowId}>
                      <tr
                        onClick={() => toggleRow(rowId)}
                        className={`cursor-pointer transition hover:bg-zinc-800/40 ${
                          isExpanded ? "bg-zinc-800/30" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-100">
                          <div className="flex items-center gap-2">
                            {/* No onClick here: Enter/Space on this button
                                bubbles up to the row's onClick. */}
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded ? "Hide details" : "Show details"
                              }
                              className="text-zinc-500 transition hover:text-zinc-200"
                            >
                              <span
                                className={`inline-block transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              >
                                ▶
                              </span>
                            </button>
                            {log.blockNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                            {log.eventName}
                          </span>
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-300"
                          title={log.contract}
                        >
                          {shorten(log.contract)}
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-300"
                          title={log.txHash}
                        >
                          {shorten(log.txHash, 10, 6)}
                        </td>
                        <td className="max-w-xs px-6 py-4">
                          <code className="block truncate rounded bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-400">
                            {JSON.stringify(parsedArgs)}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-zinc-400">
                          {formatDate(log.indexedAt)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-950/50">
                          <td colSpan={COLUMNS.length} className="px-6 py-5">
                            <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
                              <dl className="space-y-3 text-sm">
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Contract
                                  </dt>
                                  <dd className="mt-1 break-all font-mono text-xs text-zinc-300">
                                    {log.contract}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Transaction hash
                                  </dt>
                                  <dd className="mt-1 break-all font-mono text-xs text-zinc-300">
                                    {log.txHash}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Log index
                                  </dt>
                                  <dd className="mt-1 font-mono text-xs text-zinc-300">
                                    {log.logIndex}
                                  </dd>
                                </div>
                              </dl>

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                  Args
                                </p>
                                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                                  {JSON.stringify(parsedArgs, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center text-sm text-zinc-500"
                  >
                    No events found
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <p className="text-sm text-zinc-400">
            Page <span className="font-medium text-zinc-200">{page}</span>
            <span className="mx-2 text-zinc-700">·</span>
            Showing {data.res.length} of {data.count}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() => setPage((old) => Math.max(old - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                if (!isPlaceholderData && data.hasMore) {
                  setPage((old) => old + 1);
                }
              }}
              // Disable until we know a next page is available
              disabled={isPlaceholderData || !data?.hasMore}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalFeed;
