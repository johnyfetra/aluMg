CREATE TABLE "visits" (
	"day" text NOT NULL,
	"visitor" text NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "visits_day_visitor_idx" ON "visits" USING btree ("day","visitor");--> statement-breakpoint
CREATE INDEX "visits_created_idx" ON "visits" USING btree ("created_at");