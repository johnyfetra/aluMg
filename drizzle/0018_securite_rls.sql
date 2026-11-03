-- Conseils de sécurité Supabase : l'API publique (PostgREST, clé anon) ne doit rien lire dans nos tables.
-- RLS activé sans aucune politique = accès refusé aux rôles anon/authenticated. L'application se connecte en direct avec le rôle
-- propriétaire des tables (il contourne le RLS), donc rien ne change pour elle. Une table créée plus tard doit refaire ce réglage.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_\_drizzle%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;--> statement-breakpoint
-- search_path fixé sur les deux fonctions des déclencheurs « un numéro = un compte » (pg_catalog d'abord, puis public).
ALTER FUNCTION phone_unique_in_users() SET search_path = pg_catalog, public;--> statement-breakpoint
ALTER FUNCTION phone_unique_in_extra() SET search_path = pg_catalog, public;
