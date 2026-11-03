CREATE TABLE "user_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"phone_norm" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verifications" ADD COLUMN "purpose" text DEFAULT 'account' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_phones_norm_idx" ON "user_phones" USING btree ("phone_norm");--> statement-breakpoint
CREATE INDEX "user_phones_user_idx" ON "user_phones" USING btree ("user_id");--> statement-breakpoint
-- Un numéro = un seul compte, qu'il soit principal (users.phone_norm) ou supplémentaire (user_phones.phone_norm).
-- Chaque déclencheur compare avec l'autre table ; un verrou par numéro sérialise deux écritures simultanées du même numéro.
-- L'erreur est une violation d'unicité (23505) : le code qui gère déjà « numéro déjà utilisé » la reconnaît.
CREATE FUNCTION phone_unique_in_users() RETURNS trigger AS $$
BEGIN
  IF NEW.phone_norm IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.phone_norm));
    IF EXISTS (SELECT 1 FROM user_phones WHERE phone_norm = NEW.phone_norm) THEN
      RAISE EXCEPTION 'phone_taken' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_phone_unique BEFORE INSERT OR UPDATE OF phone_norm ON users FOR EACH ROW EXECUTE FUNCTION phone_unique_in_users();--> statement-breakpoint
CREATE FUNCTION phone_unique_in_extra() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.phone_norm));
  IF EXISTS (SELECT 1 FROM users WHERE phone_norm = NEW.phone_norm) THEN
    RAISE EXCEPTION 'phone_taken' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER user_phones_phone_unique BEFORE INSERT OR UPDATE OF phone_norm ON user_phones FOR EACH ROW EXECUTE FUNCTION phone_unique_in_extra();
