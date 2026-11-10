CREATE TABLE "site_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"user_id" uuid,
	"role" text DEFAULT 'visitor' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_messages" ADD CONSTRAINT "site_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_messages_status_idx" ON "site_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "site_messages_created_idx" ON "site_messages" USING btree ("created_at");