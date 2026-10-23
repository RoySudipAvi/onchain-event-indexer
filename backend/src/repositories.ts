import { db } from "./db.ts";
import {
  watchedAddresses,
  blocks,
  events,
  eventAddresses,
} from "../db/schema.ts";
import { pgHttpErrorMap } from "./utils/db-error.ts";
import {
  eq,
  desc,
  asc,
  and,
  ilike,
  sql,
  gt,
  or,
  isNull,
  inArray,
} from "drizzle-orm";
import type { Address } from "viem";
import { involvedAddresses } from "./utils/helpers.ts";

const SORTABLE_COLUMNS = {
  id: events.id,
  blockNumber: events.blockNumber,
  eventName: events.eventName,
  contract: events.contract,
  indexedAt: events.indexedAt,
} as const;

export type EventSortBy = keyof typeof SORTABLE_COLUMNS;
export type SortOrder = "asc" | "desc";

export const isEventSortBy = (value: unknown): value is EventSortBy =>
  typeof value === "string" && Object.hasOwn(SORTABLE_COLUMNS, value);

export const watchedAddressListPoller = async () => {
  const addresses = await db
    .selectDistinctOn([watchedAddresses.address], {
      address: watchedAddresses.address,
    })
    .from(watchedAddresses)
    .where(
      or(eq(watchedAddresses.active, true), isNull(watchedAddresses.active)),
    )
    .orderBy(watchedAddresses.address);

  return addresses;
};

export const watchedAddressList = async (
  user: Address,
): Promise<{
  count: bigint;
  res: any[];
}> => {
  const where = eq(watchedAddresses.watched_by, user);
  const count = await db.$count(watchedAddresses, where);
  const res = await db.select().from(watchedAddresses).where(where);
  return { count: count, res: res };
};

export const addAddressToWatch = async (
  row: object,
): Promise<{ status: boolean; msg: string }> => {
  try {
    await db.insert(watchedAddresses).values(row);
    return { status: 200, msg: "data added to watch list successfully" };
  } catch (err) {
    console.log(pgHttpErrorMap.get(err.cause.code));
    const httpErrCode = pgHttpErrorMap.get(err.cause.code);
    return {
      status: Number(httpErrCode),
      msg: err.cause.detail,
    };
  }
};

export const deleteWatchedAddress = async (id: number, user: Address) => {
  try {
    await db
      .delete(watchedAddresses)
      .where(
        and(eq(watchedAddresses.id, id), eq(watchedAddresses.watched_by, user)),
      );
    return { status: 200, msg: "data deleted from watch list successfully" };
  } catch (err) {
    console.log(err);
    console.log(pgHttpErrorMap.get(err.cause.code));
    const httpErrCode = pgHttpErrorMap.get(err.cause.code);
    return {
      status: Number(httpErrCode),
      msg: err.cause.detail,
    };
  }
};

export const addToBlocks = async (rows: object[]) => {
  try {
    const added = await db
      .insert(blocks)
      .values(rows)
      .onConflictDoNothing()
      .returning();
    return {
      status: 200,
      msg: "Block addedd successfully",
      numOfRows: added.length,
      addedRows: added,
    };
  } catch (err) {
    return { status: 400, msg: err.cause.detail };
  }
};

export const addToEvents = async (rows: object[]) => {
  try {
    const added = await db
      .insert(events)
      .values(rows)
      .onConflictDoNothing({ target: [events.txHash, events.logIndex] })
      .returning();
    return {
      status: 200,
      msg: "Event addedd successfully",
      numOfRows: added.length,
      addedRows: added,
    };
  } catch (err) {
    return { status: 400, msg: err };
  }
};

export const saveBlocksAndEvents = async (
  blockRows: object[],
  eventRows: object[],
  watched: Address[],
) => {
  try {
    const watchedSet = new Set<string>(watched);
    const addedEvents = await db.transaction(async (tx) => {
      await tx.insert(blocks).values(blockRows).onConflictDoNothing();
      if (eventRows.length === 0) return [];
      const inserted = await tx
        .insert(events)
        .values(eventRows)
        .onConflictDoNothing({ target: [events.txHash, events.logIndex] })
        .returning();
      const withAddresses = inserted.map((ev) => ({
        ...ev,
        addresses: involvedAddresses(ev.args, watchedSet),
      }));
      const links = withAddresses.flatMap((ev) =>
        ev.addresses.map((address) => ({ eventId: ev.id, address })),
      );
      if (links.length > 0) {
        await tx.insert(eventAddresses).values(links).onConflictDoNothing();
      }
      return withAddresses;
    });
    return {
      status: 200,
      msg: "Blocks and events saved successfully",
      numOfRows: addedEvents.length,
      addedRows: addedEvents,
    };
  } catch (err) {
    return { status: 400, msg: err };
  }
};

export const getLastBlock = async () => {
  const lastBlock = await db
    .select()
    .from(blocks)
    .orderBy(desc(blocks.number))
    .limit(1);

  return lastBlock;
};

export const getRecentBlocks = async (limit: number) => {
  return await db
    .select()
    .from(blocks)
    .orderBy(desc(blocks.number))
    .limit(limit);
};

export const rollbackAbove = async (ancestor: bigint) => {
  await db.transaction(async (tx) => {
    await tx.delete(events).where(gt(events.blockNumber, ancestor));
    await tx.delete(blocks).where(gt(blocks.number, ancestor));
  });
};

export const getEvents = async (
  user: Address,
  page: number,
  limit: number,
  sortBy: EventSortBy = "id",
  sortOrder: SortOrder = "desc",
  filters: object,
): Promise<{ count: bigint; res: any[]; hasMore: boolean }> => {
  const offset = (page - 1) * limit;
  const direction = sortOrder === "asc" ? asc : desc;
  const sortColumn = SORTABLE_COLUMNS[sortBy];
  const orderBy =
    sortBy === "id"
      ? [direction(events.id)]
      : [direction(sortColumn), direction(events.id)];

  const visibleToUser = inArray(
    events.id,
    db
      .select({ id: eventAddresses.eventId })
      .from(eventAddresses)
      .innerJoin(
        watchedAddresses,
        eq(watchedAddresses.address, eventAddresses.address),
      )
      .where(eq(watchedAddresses.watched_by, user)),
  );

  const where = and(
    visibleToUser,
    ilike(events.contract, `%${filters.contract}%`),
    ilike(events.eventName, `%${filters.eventName}%`),
    ilike(sql`${events.args}::text`, `%${filters.wallet}%`),
  );

  const res = await db
    .select()
    .from(events)
    .where(where)
    .orderBy(...orderBy)
    .limit(Number(limit))
    .offset(offset);

  const totalCount = await db.$count(events, where);
  const hasMore = offset + res.length < totalCount;
  return { count: totalCount, res: res, hasMore: hasMore };
};

export const watchersByAddress = async (
  addresses: string[],
): Promise<Map<string, string[]>> => {
  const map = new Map<string, string[]>();
  if (addresses.length === 0) return map;
  const rows = await db
    .select({
      address: watchedAddresses.address,
      user: watchedAddresses.watched_by,
    })
    .from(watchedAddresses)
    .where(inArray(watchedAddresses.address, addresses));
  for (const r of rows) {
    map.set(r.address, [...(map.get(r.address) ?? []), r.user]);
  }
  return map;
};
