CREATE TABLE "blocks" (
	"number" bigint PRIMARY KEY,
	"hash" text NOT NULL UNIQUE,
	"parent_hash" text NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"block_number" bigint,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"contract" text NOT NULL,
	"event_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"removed" boolean DEFAULT false,
	"indexed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tx_log" UNIQUE("tx_hash","log_index")
);
--> statement-breakpoint
CREATE TABLE "watched_addresses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "watched_addresses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"address" text NOT NULL UNIQUE,
	"label" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_block_number_blocks_number_fkey" FOREIGN KEY ("block_number") REFERENCES "blocks"("number");