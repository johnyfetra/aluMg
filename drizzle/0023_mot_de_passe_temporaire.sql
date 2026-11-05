ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Couleur de devis : le nouveau défaut est celle de l'application. On retire l'ancien bleu par défaut des réglages enregistrés (sans valeur, withDefaults reprend le défaut).
UPDATE "settings" SET "data" = "data" - 'accent' WHERE "data"->>'accent' = '#1d4ed8';
