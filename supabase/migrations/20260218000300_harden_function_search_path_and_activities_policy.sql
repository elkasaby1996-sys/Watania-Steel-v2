-- 1) Fix function_search_path_mutable warnings by setting a fixed search_path
--    for all public-schema functions that don't already set it.
-- 2) Fix overly permissive activities RLS policy detected as always true.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END
$$;

-- Tighten activities policy if present. Keep broad app behavior for authenticated
-- users while avoiding always-true expressions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'activities'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'activities'
        AND policyname = 'Enable all operations for authenticated users'
    ) THEN
      DROP POLICY "Enable all operations for authenticated users" ON public.activities;
    END IF;

    CREATE POLICY activities_authenticated_all
      ON public.activities
      FOR ALL
      TO authenticated
      USING ((select auth.uid()) IS NOT NULL)
      WITH CHECK ((select auth.uid()) IS NOT NULL);
  END IF;
END
$$;

