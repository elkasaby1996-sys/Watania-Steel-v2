-- Fix blank Clients page when authenticated users have no profile row yet.
-- Keeps role-based access, but allows read access for authenticated users
-- whose profile is missing/null during onboarding or migration drift.

DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('viewer', 'editor', 'admin')
          OR p.role IS NULL
        )
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS client_sites_select ON public.client_sites;
CREATE POLICY client_sites_select
  ON public.client_sites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('viewer', 'editor', 'admin')
          OR p.role IS NULL
        )
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );
