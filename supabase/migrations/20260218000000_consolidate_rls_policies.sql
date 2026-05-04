-- Consolidate overlapping permissive RLS policies to reduce planner overhead.
-- Goal: one policy per action per table for the same role scope.

-- Common role checks used below:
-- - any_app_user: viewer/editor/admin
-- - editor_or_admin: editor/admin

-- Helper used by profiles policies to avoid recursive self-reference.
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

-- ---------------------------------------------------------------------------
-- profiles: replace overlapping admin + self policies with explicit per-action
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
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
        (id = (select auth.uid()))
        OR public.is_admin_user()
      );

    CREATE POLICY profiles_insert
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (id = (select auth.uid()))
        OR public.is_admin_user()
      );

    CREATE POLICY profiles_update
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (
        (id = (select auth.uid()))
        OR public.is_admin_user()
      )
      WITH CHECK (
        (id = (select auth.uid()))
        OR public.is_admin_user()
      );

    CREATE POLICY profiles_delete
      ON public.profiles
      FOR DELETE
      TO authenticated
      USING (public.is_admin_user());
  END IF;
END
$$;

-- -------------------------------------------------
-- clients + client_sites: drop duplicate *_read SELECT
-- -------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL THEN
    DROP POLICY IF EXISTS clients_read ON public.clients;
  END IF;

  IF to_regclass('public.client_sites') IS NOT NULL THEN
    DROP POLICY IF EXISTS client_sites_read ON public.client_sites;
  END IF;
END
$$;

-- ----------------------------------------------------
-- drivers: consolidate to one SELECT + one per write op
-- ----------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.drivers') IS NOT NULL THEN
    ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
    DROP POLICY IF EXISTS "Editors can manage drivers" ON public.drivers;
    DROP POLICY IF EXISTS drivers_select ON public.drivers;
    DROP POLICY IF EXISTS drivers_insert ON public.drivers;
    DROP POLICY IF EXISTS drivers_update ON public.drivers;
    DROP POLICY IF EXISTS drivers_delete ON public.drivers;

    CREATE POLICY drivers_select
      ON public.drivers
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('viewer', 'editor', 'admin')
        )
      );

    CREATE POLICY drivers_insert
      ON public.drivers
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY drivers_update
      ON public.drivers
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY drivers_delete
      ON public.drivers
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role = 'admin'
        )
      );
  END IF;
END
$$;

-- ---------------------------------------------------------
-- orders: consolidate overlapping manage/view/select policies
-- ---------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
    DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;
    DROP POLICY IF EXISTS "Editors can manage orders" ON public.orders;
    DROP POLICY IF EXISTS orders_select_role_based ON public.orders;
    DROP POLICY IF EXISTS orders_select ON public.orders;
    DROP POLICY IF EXISTS orders_insert ON public.orders;
    DROP POLICY IF EXISTS orders_update ON public.orders;
    DROP POLICY IF EXISTS orders_delete ON public.orders;

    CREATE POLICY orders_select
      ON public.orders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('viewer', 'editor', 'admin')
        )
      );

    CREATE POLICY orders_insert
      ON public.orders
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY orders_update
      ON public.orders
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY orders_delete
      ON public.orders
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role = 'admin'
        )
      );
  END IF;
END
$$;

-- ------------------------------------------------------------------
-- history_orders: consolidate overlapping view/insert/update policies
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.history_orders') IS NOT NULL THEN
    ALTER TABLE public.history_orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can view history orders" ON public.history_orders;
    DROP POLICY IF EXISTS "Authenticated users can insert history orders" ON public.history_orders;
    DROP POLICY IF EXISTS "Authenticated users can update history orders" ON public.history_orders;
    DROP POLICY IF EXISTS "Editors can manage history orders" ON public.history_orders;
    DROP POLICY IF EXISTS history_orders_select ON public.history_orders;
    DROP POLICY IF EXISTS history_orders_insert ON public.history_orders;
    DROP POLICY IF EXISTS history_orders_update ON public.history_orders;
    DROP POLICY IF EXISTS history_orders_delete ON public.history_orders;

    CREATE POLICY history_orders_select
      ON public.history_orders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('viewer', 'editor', 'admin')
        )
      );

    CREATE POLICY history_orders_insert
      ON public.history_orders
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY history_orders_update
      ON public.history_orders
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role IN ('editor', 'admin')
        )
      );

    CREATE POLICY history_orders_delete
      ON public.history_orders
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (select auth.uid())
            AND p.role = 'admin'
        )
      );
  END IF;
END
$$;
