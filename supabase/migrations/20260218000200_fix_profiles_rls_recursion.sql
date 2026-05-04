-- Hotfix: resolve infinite recursion in profiles RLS policies.
-- Error observed: 42P17 "infinite recursion detected in policy for relation profiles"

-- SECURITY DEFINER helper avoids recursive RLS evaluation on public.profiles.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS profiles_select ON public.profiles;
  DROP POLICY IF EXISTS profiles_insert ON public.profiles;
  DROP POLICY IF EXISTS profiles_update ON public.profiles;
  DROP POLICY IF EXISTS profiles_delete ON public.profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

  CREATE POLICY profiles_select
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      id = (select auth.uid())
      OR public.is_admin_user()
    );

  CREATE POLICY profiles_insert
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      id = (select auth.uid())
      OR public.is_admin_user()
    );

  CREATE POLICY profiles_update
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      id = (select auth.uid())
      OR public.is_admin_user()
    )
    WITH CHECK (
      id = (select auth.uid())
      OR public.is_admin_user()
    );

  CREATE POLICY profiles_delete
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_admin_user());
END
$$;

