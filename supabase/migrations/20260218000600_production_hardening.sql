-- Production hardening baseline for clients/client_sites analytics and merge flows.
-- This migration is idempotent and safe to rerun.

-- Performance indexes used by dashboard/client RPCs.
CREATE INDEX IF NOT EXISTS idx_orders_client_id_date ON public.orders (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_history_orders_client_id_date ON public.history_orders (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_site_id_date ON public.orders (site_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_history_orders_site_id_date ON public.history_orders (site_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_sites_client_id_name ON public.client_sites (client_id, name);

-- Ensure client_sites performance always returns all sites (including zero-order sites).
DROP FUNCTION IF EXISTS public.get_client_sites_performance(uuid);

CREATE OR REPLACE FUNCTION public.get_client_sites_performance(client_id uuid)
RETURNS TABLE (
  site_id uuid,
  site_name text,
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
    WHERE client_id = get_client_sites_performance.client_id
      AND site_id IS NOT NULL
    UNION ALL
    SELECT site_id, date, tons
    FROM public.history_orders
    WHERE client_id = get_client_sites_performance.client_id
      AND site_id IS NOT NULL
  ),
  aggregated AS (
    SELECT site_id,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(tons), 0)::numeric AS total_tons,
      MAX(date) AS last_order_date
    FROM combined
    GROUP BY site_id
  )
  SELECT s.id AS site_id,
    s.name AS site_name,
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
  LEFT JOIN aggregated a ON a.site_id = s.id
  WHERE s.client_id = get_client_sites_performance.client_id
  ORDER BY total_tons DESC, site_name ASC;
$$;

-- Missing in previous migrations but used by frontend API.
CREATE OR REPLACE FUNCTION public.merge_clients(
  p_primary_client_id uuid,
  p_duplicate_client_id uuid,
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
  v_sites_updated bigint := 0;
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

  IF p_primary_client_id = p_duplicate_client_id THEN
    RAISE EXCEPTION 'Primary and duplicate client IDs must be different';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_primary_client_id) THEN
    RAISE EXCEPTION 'Primary client not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_duplicate_client_id) THEN
    RAISE EXCEPTION 'Duplicate client not found';
  END IF;

  UPDATE public.orders
  SET client_id = p_primary_client_id
  WHERE client_id = p_duplicate_client_id;
  GET DIAGNOSTICS v_orders_updated = ROW_COUNT;

  UPDATE public.history_orders
  SET client_id = p_primary_client_id
  WHERE client_id = p_duplicate_client_id;
  GET DIAGNOSTICS v_history_updated = ROW_COUNT;

  UPDATE public.client_sites
  SET client_id = p_primary_client_id
  WHERE client_id = p_duplicate_client_id;
  GET DIAGNOSTICS v_sites_updated = ROW_COUNT;

  IF p_new_primary_name IS NOT NULL AND length(trim(p_new_primary_name)) > 0 THEN
    UPDATE public.clients
    SET name = p_new_primary_name,
        name_normalized = lower(regexp_replace(p_new_primary_name, '[^a-z0-9]+', '', 'g')),
        updated_at = NOW()
    WHERE id = p_primary_client_id;
    v_primary_renamed := true;
  END IF;

  DELETE FROM public.clients
  WHERE id = p_duplicate_client_id;
  v_duplicate_deleted := FOUND;

  RETURN jsonb_build_object(
    'primary_client_id', p_primary_client_id,
    'duplicate_client_id', p_duplicate_client_id,
    'orders_updated', v_orders_updated,
    'history_orders_updated', v_history_updated,
    'sites_updated', v_sites_updated,
    'primary_renamed', v_primary_renamed,
    'duplicate_deleted', v_duplicate_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_sites_performance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_clients(uuid, uuid, text) TO authenticated;
