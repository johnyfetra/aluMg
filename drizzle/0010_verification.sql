CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_norm" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
-- Reprise des comptes existants : numéro normalisé (le plus ancien compte garde un numéro partagé) et comptes considérés comme vérifiés.
UPDATE "users" u SET "phone_norm" = s.n FROM (
  SELECT DISTINCT ON (n) id, n FROM (
    SELECT id, created_at,
      CASE WHEN regexp_replace(phone, '[^0-9+]', '', 'g') LIKE '+%' THEN regexp_replace(phone, '[^0-9+]', '', 'g')
           WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '0%' THEN '+261' || substr(regexp_replace(phone, '[^0-9]', '', 'g'), 2)
           ELSE '+' || regexp_replace(phone, '[^0-9]', '', 'g') END AS n
    FROM users WHERE regexp_replace(phone, '[^0-9]', '', 'g') <> ''
  ) t ORDER BY n, created_at
) s WHERE u.id = s.id;--> statement-breakpoint
UPDATE "users" SET "phone_verified_at" = now() WHERE "phone_verified_at" IS NULL;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verifications_user_idx" ON "verifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_norm_idx" ON "users" USING btree ("phone_norm");