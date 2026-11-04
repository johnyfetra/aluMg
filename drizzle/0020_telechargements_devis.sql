CREATE TABLE "quote_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"user_id" uuid,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_downloads" ADD CONSTRAINT "quote_downloads_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_downloads" ADD CONSTRAINT "quote_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_downloads_quote_idx" ON "quote_downloads" USING btree ("quote_id");--> statement-breakpoint
-- Sécurité (voir 0018) : une table créée plus tard doit refaire ce réglage.
ALTER TABLE "quote_downloads" ENABLE ROW LEVEL SECURITY;
