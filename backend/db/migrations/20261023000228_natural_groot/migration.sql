CREATE TABLE "event_addresses" (
	"event_id" bigint,
	"address" text,
	CONSTRAINT "event_addresses_pkey" PRIMARY KEY("event_id","address")
);
--> statement-breakpoint
CREATE INDEX "event_addresses_address_idx" ON "event_addresses" ("address");--> statement-breakpoint
ALTER TABLE "event_addresses" ADD CONSTRAINT "event_addresses_event_id_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;