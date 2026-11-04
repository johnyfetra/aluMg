CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Sécurité (voir 0018) : une table créée plus tard doit refaire ce réglage. RLS sans politique = rien de lisible par l'API publique ; l'application passe par le rôle propriétaire.
ALTER TABLE "social_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Première entrée : la page Facebook d'AluMg.
INSERT INTO "social_links" ("network", "label", "url", "position") VALUES ('facebook', 'AluMg sur Facebook', 'https://www.facebook.com/profile.php?id=61595904374968', 0);
