CREATE TABLE "quote_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"paid_on" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operator" text NOT NULL,
	"reference" text NOT NULL,
	"payer_phone" text DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"months" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_receipts" ADD CONSTRAINT "quote_receipts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_receipts" ADD CONSTRAINT "quote_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_receipts_quote_idx" ON "quote_receipts" USING btree ("quote_id","paid_on");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_ref_idx" ON "subscription_payments" USING btree ("operator","reference");--> statement-breakpoint
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "subscription_payments_user_idx" ON "subscription_payments" USING btree ("user_id","created_at");