-- Ensure client_sites has required contact/location fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'location_text'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN location_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'google_maps_url'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN google_maps_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN notes text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;

-- Clients policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_select'
  ) THEN
    CREATE POLICY clients_select
      ON public.clients
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('viewer', 'editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_insert'
  ) THEN
    CREATE POLICY clients_insert
      ON public.clients
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_update'
  ) THEN
    CREATE POLICY clients_update
      ON public.clients
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_delete'
  ) THEN
    CREATE POLICY clients_delete
      ON public.clients
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Client sites policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_sites'
      AND policyname = 'client_sites_select'
  ) THEN
    CREATE POLICY client_sites_select
      ON public.client_sites
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('viewer', 'editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_sites'
      AND policyname = 'client_sites_insert'
  ) THEN
    CREATE POLICY client_sites_insert
      ON public.client_sites
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_sites'
      AND policyname = 'client_sites_update'
  ) THEN
    CREATE POLICY client_sites_update
      ON public.client_sites
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('editor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_sites'
      AND policyname = 'client_sites_delete'
  ) THEN
    CREATE POLICY client_sites_delete
      ON public.client_sites
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Ensure summary RPC includes contact/location columns
CREATE OR REPLACE FUNCTION public.get_client_site_summary(
  client_id uuid,
  site_id uuid
)
RETURNS TABLE (
  site_id uuid,
  site_name text,
  client_id uuid,
  client_name text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  location_text text,
  google_maps_url text,
  notes text,
  total_orders bigint,
  total_tons numeric,
  last_order_date date
)
LANGUAGE sql
STABLE
AS $$
  WITH combined AS (
    SELECT site_id, date, tons
    FROM public.orders
    WHERE client_id = get_client_site_summary.client_id
      AND site_id = get_client_site_summary.site_id
    UNION ALL
    SELECT site_id, date, tons
    FROM public.history_orders
    WHERE client_id = get_client_site_summary.client_id
      AND site_id = get_client_site_summary.site_id
  ),
  aggregated AS (
    SELECT COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(tons), 0)::numeric AS total_tons,
      MAX(date) AS last_order_date
    FROM combined
  )
  SELECT s.id AS site_id,
    s.name AS site_name,
    s.client_id,
    c.name AS client_name,
    s.contact_name,
    s.contact_phone,
    s.contact_email,
    s.address,
    s.location_text,
    s.google_maps_url,
    s.notes,
    COALESCE(a.total_orders, 0) AS total_orders,
    COALESCE(a.total_tons, 0) AS total_tons,
    a.last_order_date
  FROM public.client_sites s
  JOIN public.clients c ON c.id = s.client_id
  LEFT JOIN aggregated a ON true
  WHERE s.id = get_client_site_summary.site_id
    AND s.client_id = get_client_site_summary.client_id;
$$;

-- Update client details
CREATE OR REPLACE FUNCTION public.update_client(
  p_client_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_address text,
  p_notes text
)
RETURNS public.clients
LANGUAGE sql
AS $$
  UPDATE public.clients
  SET contact_name = p_contact_name,
      contact_email = p_contact_email,
      contact_phone = p_contact_phone,
      address = p_address,
      notes = p_notes,
      updated_at = NOW()
  WHERE id = p_client_id
  RETURNING *;
$$;

-- Update site details
CREATE OR REPLACE FUNCTION public.update_site(
  p_site_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_location_text text,
  p_google_maps_url text,
  p_notes text
)
RETURNS public.client_sites
LANGUAGE sql
AS $$
  UPDATE public.client_sites
  SET contact_name = p_contact_name,
      contact_phone = p_contact_phone,
      location_text = p_location_text,
      google_maps_url = p_google_maps_url,
      notes = p_notes,
      updated_at = NOW()
  WHERE id = p_site_id
  RETURNING *;
$$;

-- Merge duplicate client sites
CREATE OR REPLACE FUNCTION public.merge_client_sites(
  p_client_id uuid,
  p_primary_site_id uuid,
  p_duplicate_site_id uuid,
  p_new_primary_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_updated bigint := 0;
  v_history_updated bigint := 0;
  v_duplicate_deleted boolean := false;
  v_primary_renamed boolean := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.client_sites
    WHERE id = p_primary_site_id
      AND client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'Primary site not found for client';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.client_sites
    WHERE id = p_duplicate_site_id
      AND client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'Duplicate site not found for client';
  END IF;

  UPDATE public.orders
  SET site_id = p_primary_site_id
  WHERE client_id = p_client_id
    AND site_id = p_duplicate_site_id;
  GET DIAGNOSTICS v_orders_updated = ROW_COUNT;

  UPDATE public.history_orders
  SET site_id = p_primary_site_id
  WHERE client_id = p_client_id
    AND site_id = p_duplicate_site_id;
  GET DIAGNOSTICS v_history_updated = ROW_COUNT;

  IF p_new_primary_name IS NOT NULL AND length(trim(p_new_primary_name)) > 0 THEN
    UPDATE public.client_sites
    SET name = p_new_primary_name,
        name_normalized = lower(regexp_replace(p_new_primary_name, '[^a-z0-9]+', '', 'g')),
        updated_at = NOW()
    WHERE id = p_primary_site_id;
    v_primary_renamed := true;
  END IF;

  DELETE FROM public.client_sites
  WHERE id = p_duplicate_site_id
    AND client_id = p_client_id;
  v_duplicate_deleted := FOUND;

  RETURN jsonb_build_object(
    'primary_site_id', p_primary_site_id,
    'duplicate_site_id', p_duplicate_site_id,
    'orders_updated', v_orders_updated,
    'history_orders_updated', v_history_updated,
    'primary_renamed', v_primary_renamed,
    'duplicate_deleted', v_duplicate_deleted
  );
END;
$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_client_sites_client_id ON public.client_sites (client_id);
CREATE INDEX IF NOT EXISTS idx_client_sites_name_normalized ON public.client_sites (name_normalized);
CREATE INDEX IF NOT EXISTS idx_orders_site_id ON public.orders (site_id);
CREATE INDEX IF NOT EXISTS idx_history_orders_site_id ON public.history_orders (site_id);

GRANT EXECUTE ON FUNCTION public.get_client_site_summary(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_site(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_client_sites(uuid, uuid, uuid, text) TO authenticated;
