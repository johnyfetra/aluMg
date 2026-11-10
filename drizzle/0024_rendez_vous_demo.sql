CREATE TABLE "demo_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"place" text NOT NULL,
	"day" text NOT NULL,
	"slot" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_bookings_slot_idx" ON "demo_bookings" USING btree ("day","slot") WHERE "demo_bookings"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "demo_bookings_day_idx" ON "demo_bookings" USING btree ("day");--> statement-breakpoint
CREATE INDEX "demo_bookings_phone_idx" ON "demo_bookings" USING btree ("phone");