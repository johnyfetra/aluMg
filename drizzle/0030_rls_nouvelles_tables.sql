-- Conseiller de sécurité Supabase : les tables créées depuis 0018 (demo_bookings, site_messages, visits, quote_receipts,
-- subscription_payments) étaient sans RLS, donc lisibles et modifiables avec la clé anon publique. Même réglage que 0018 :
-- RLS sans politique, l'application (rôle propriétaire) n'est pas concernée. Le test lib/migrations.test.ts l'impose désormais.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_\_drizzle%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
--> statement-breakpoint
-- Défense en profondeur : l'application ne passe jamais par l'API publique de Supabase (ni supabase-js, ni clé anon côté
-- navigateur). On retire donc aux rôles anon/authenticated tout droit sur nos tables, séquences et fonctions, y compris
-- celles que le rôle courant créera plus tard. Rien à faire hors Supabase (PGlite, Postgres nu) : ces rôles n'existent pas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
