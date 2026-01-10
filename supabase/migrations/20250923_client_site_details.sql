-- Add site detail columns to client_sites
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

-- Refresh client_id/site_id links for existing orders.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'backfill_client_sites'
      AND pg_function_is_visible(oid)
  ) THEN
    PERFORM public.backfill_client_sites();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'orders_set_client_site_ids'
  ) THEN
    CREATE TRIGGER orders_set_client_site_ids
    BEFORE INSERT OR UPDATE OF company, site
    ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_client_site_ids();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'history_orders_set_client_site_ids'
  ) THEN
    CREATE TRIGGER history_orders_set_client_site_ids
    BEFORE INSERT OR UPDATE OF company, site
    ON public.history_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_client_site_ids();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_client_sites_performance(client_id uuid)
RETURNS TABLE (
  site_id uuid,
  site_name text,
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
  )
  SELECT s.id AS site_id,
    s.name AS site_name,
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(combined.tons), 0)::numeric AS total_tons,
    MAX(combined.date) AS last_order_date
  FROM combined
  JOIN public.client_sites s ON s.id = combined.site_id
  GROUP BY s.id, s.name
  ORDER BY total_tons DESC, site_name ASC;
$$;

DROP FUNCTION IF EXISTS public.get_client_orders_page(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_client_orders_page(
  client_id uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  date date,
  status text,
  amount numeric,
  tons numeric,
  company text,
  site text,
  order_type text,
  shift text,
  delivered_at timestamptz,
  signed_delivery_note boolean,
  delivery_number text,
  driver_name text,
  phone_number text,
  customer_name text,
  source text,
  total_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH unified AS (
    SELECT id::text AS id, date, status, amount, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      -- Mixed id types across orders/history_orders require a text identifier.
      'orders'::text AS source
    FROM public.orders
    WHERE client_id = get_client_orders_page.client_id
    UNION ALL
    SELECT id::text AS id, date, status, amount, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      'history_orders'::text AS source
    FROM public.history_orders
    WHERE client_id = get_client_orders_page.client_id
  )
  SELECT *, COUNT(*) OVER() AS total_count
  FROM unified
  ORDER BY date DESC NULLS LAST
  LIMIT limit_count OFFSET offset_count;
$$;

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
