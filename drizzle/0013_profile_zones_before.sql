ALTER TABLE "menuisier_profiles" ADD COLUMN "zones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "menuisier_profiles" ADD COLUMN "since_year" integer;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "before" text DEFAULT '' NOT NULL;