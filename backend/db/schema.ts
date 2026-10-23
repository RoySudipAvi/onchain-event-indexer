import {
  text,
  integer,
  bigint,
  snakeCase,
  boolean,
  timestamp,
  unique,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const watchedAddresses = snakeCase.table(
  "watched_addresses",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    address: text().notNull(),
    label: text(),
    watched_by: text().notNull(),
    active: boolean().default(true),
    createdAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (t) => [unique("wa_unique").on(t.address, t.watched_by)],
);

export const blocks = snakeCase.table("blocks", {
  number: bigint({ mode: "bigint" }).primaryKey(),
  hash: text().notNull().unique(),
  parent_hash: text().notNull(),
  indexedAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const events = snakeCase.table(
  "events",
  {
    id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    blockNumber: bigint({ mode: "bigint" }).references(() => blocks.number),
    txHash: text().notNull(),
    logIndex: integer().notNull(),
    contract: text().notNull(),
    eventName: text().notNull(),
    args: jsonb().notNull(),
    removed: boolean().default(false),
    indexedAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (t) => [unique("tx_log").on(t.txHash, t.logIndex)],
);

export const eventAddresses = snakeCase.table(
  "event_addresses",
  {
    eventId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    address: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.address] }),
    index("event_addresses_address_idx").on(t.address),
  ],
);
