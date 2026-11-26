CREATE TABLE "app_trials" (
	"device" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"checks" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
-- Table interne : jamais lue par l'API publique de Supabase (voir 0030).
ALTER TABLE "app_trials" ENABLE ROW LEVEL SECURITY;