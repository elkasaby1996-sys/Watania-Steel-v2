-- Optimize RLS policies by wrapping auth.*() calls in SELECT.
-- This preserves policy logic while improving planner behavior:
--   auth.uid()  -> (select auth.uid())
--   auth.role() -> (select auth.role())
--   auth.jwt()  -> (select auth.jwt())
--
-- Addresses Supabase linter warning: auth_rls_initplan

CREATE OR REPLACE FUNCTION public._normalize_rls_auth_calls(p_expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_expr text := p_expr;
BEGIN
  IF v_expr IS NULL THEN
    RETURN NULL;
  END IF;

  v_expr := regexp_replace(v_expr, '\mauth\.uid\(\)', '(select auth.uid())', 'gi');
  v_expr := regexp_replace(v_expr, '\mauth\.role\(\)', '(select auth.role())', 'gi');
  v_expr := regexp_replace(v_expr, '\mauth\.jwt\(\)', '(select auth.jwt())', 'gi');

  RETURN v_expr;
END;
$$;

DO $$
DECLARE
  p record;
  v_new_qual text;
  v_new_check text;
  v_roles_sql text;
  v_create_sql text;
BEGIN
  FOR p IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      cmd,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~* '\mauth\.(uid|role|jwt)\(\)'
        OR COALESCE(with_check, '') ~* '\mauth\.(uid|role|jwt)\(\)'
      )
  LOOP
    v_new_qual := public._normalize_rls_auth_calls(p.qual);
    v_new_check := public._normalize_rls_auth_calls(p.with_check);

    IF v_new_qual IS NOT DISTINCT FROM p.qual
       AND v_new_check IS NOT DISTINCT FROM p.with_check THEN
      CONTINUE;
    END IF;

    IF p.roles IS NULL OR array_length(p.roles, 1) IS NULL THEN
      v_roles_sql := 'PUBLIC';
    ELSIF array_length(p.roles, 1) = 1 AND p.roles[1] = 'public' THEN
      v_roles_sql := 'PUBLIC';
    ELSE
      SELECT string_agg(quote_ident(role_name), ', ')
      INTO v_roles_sql
      FROM unnest(p.roles) AS role_name;
    END IF;

    v_create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      p.permissive,
      p.cmd,
      v_roles_sql
    );

    IF v_new_qual IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' USING (%s)', v_new_qual);
    END IF;

    IF v_new_check IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' WITH CHECK (%s)', v_new_check);
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    EXECUTE v_create_sql;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public._normalize_rls_auth_calls(text);

