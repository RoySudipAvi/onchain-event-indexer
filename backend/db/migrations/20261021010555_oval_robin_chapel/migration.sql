ALTER TABLE "watched_addresses" DROP CONSTRAINT "watched_addresses_address_key";--> statement-breakpoint
ALTER TABLE "watched_addresses" ADD COLUMN "watched_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "watched_addresses" ADD CONSTRAINT "wa_unique" UNIQUE("address","watched_by");