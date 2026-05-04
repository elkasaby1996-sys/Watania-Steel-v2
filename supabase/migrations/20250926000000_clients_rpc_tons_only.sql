-- Ensure clients table has contact fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN notes text;
  END IF;
END $$;

-- Ensure client_sites has contact/location fields
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
      AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sites'
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.client_sites ADD COLUMN address text;
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

DROP FUNCTION IF EXISTS public.get_clients_summary(text);
DROP FUNCTION IF EXISTS public.get_client_summary(uuid);
DROP FUNCTION IF EXISTS public.get_client_orders_page(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_client_sites_performance(uuid);
DROP FUNCTION IF EXISTS public.get_client_site_summary(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_client_site_orders_page(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_client_analytics(uuid);

CREATE OR REPLACE FUNCTION public.get_clients_summary(search_text text)
RETURNS TABLE (
  id uuid,
  name text,
  total_orders bigint,
  total_tons numeric,
  unique_sites bigint,
  last_order_date date
)
LANGUAGE sql
STABLE
AS $$
  WITH filtered_clients AS (
    SELECT id, name
    FROM public.clients
    WHERE search_text IS NULL
      OR name ILIKE '%' || search_text || '%'
  ),
  combined AS (
    SELECT client_id, site_id, date, tons
    FROM public.orders
    UNION ALL
    SELECT client_id, site_id, date, tons
    FROM public.history_orders
  ),
  aggregated AS (
    SELECT client_id,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(tons), 0)::numeric AS total_tons,
      COUNT(DISTINCT site_id)::bigint AS unique_sites,
      MAX(date) AS last_order_date
    FROM combined
    GROUP BY client_id
  )
  SELECT c.id,
    c.name,
    COALESCE(a.total_orders, 0) AS total_orders,
    COALESCE(a.total_tons, 0) AS total_tons,
    COALESCE(a.unique_sites, 0) AS unique_sites,
    a.last_order_date
  FROM filtered_clients c
  LEFT JOIN aggregated a ON a.client_id = c.id
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.get_client_summary(client_id uuid)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  notes text,
  total_orders bigint,
  total_tons numeric,
  unique_sites bigint,
  last_order_date date
)
LANGUAGE sql
STABLE
AS $$
  WITH combined AS (
    SELECT client_id, site_id, date, tons
    FROM public.orders
    WHERE client_id = get_client_summary.client_id
    UNION ALL
    SELECT client_id, site_id, date, tons
    FROM public.history_orders
    WHERE client_id = get_client_summary.client_id
  ),
  aggregated AS (
    SELECT client_id,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(tons), 0)::numeric AS total_tons,
      COUNT(DISTINCT site_id)::bigint AS unique_sites,
      MAX(date) AS last_order_date
    FROM combined
    GROUP BY client_id
  )
  SELECT c.id AS client_id,
    c.name AS client_name,
    c.contact_name,
    c.contact_phone,
    c.contact_email,
    c.address,
    c.notes,
    COALESCE(a.total_orders, 0) AS total_orders,
    COALESCE(a.total_tons, 0) AS total_tons,
    COALESCE(a.unique_sites, 0) AS unique_sites,
    a.last_order_date
  FROM public.clients c
  LEFT JOIN aggregated a ON a.client_id = c.id
  WHERE c.id = get_client_summary.client_id;
$$;

CREATE OR REPLACE FUNCTION public.get_client_orders_page(
  client_id uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  date date,
  status text,
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
    SELECT id::text AS id, date, status, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      'orders'::text AS source
    FROM public.orders
    WHERE client_id = get_client_orders_page.client_id
    UNION ALL
    SELECT id::text AS id, date, status, tons, company, site, order_type, shift, delivered_at,
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
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(combined.tons), 0)::numeric AS total_tons,
    MAX(combined.date) AS last_order_date
  FROM combined
  JOIN public.client_sites s ON s.id = combined.site_id
  GROUP BY s.id, s.name, s.contact_name, s.contact_phone, s.contact_email, s.address, s.location_text, s.google_maps_url, s.notes
  ORDER BY total_tons DESC, site_name ASC;
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

CREATE OR REPLACE FUNCTION public.get_client_site_orders_page(
  client_id uuid,
  site_id uuid,
  limit_count integer DEFAULT 25,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  date date,
  status text,
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
    SELECT id::text AS id, date, status, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      'orders'::text AS source
    FROM public.orders
    WHERE client_id = get_client_site_orders_page.client_id
      AND site_id = get_client_site_orders_page.site_id
    UNION ALL
    SELECT id::text AS id, date, status, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      'history_orders'::text AS source
    FROM public.history_orders
    WHERE client_id = get_client_site_orders_page.client_id
      AND site_id = get_client_site_orders_page.site_id
  )
  SELECT *, COUNT(*) OVER() AS total_count
  FROM unified
  ORDER BY date DESC NULLS LAST
  LIMIT limit_count OFFSET offset_count;
$$;

CREATE OR REPLACE FUNCTION public.get_client_analytics(client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH unified AS (
    SELECT date, status, order_type, shift, tons,
      breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
      breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
    FROM public.orders
    WHERE client_id = get_client_analytics.client_id
    UNION ALL
    SELECT date, status, order_type, shift, tons,
      breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
      breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
    FROM public.history_orders
    WHERE client_id = get_client_analytics.client_id
  ),
  monthly AS (
    SELECT date_trunc('month', date)::date AS month_start,
      to_char(date_trunc('month', date), 'Mon YY') AS month_label,
      COALESCE(SUM(tons), 0)::numeric AS tons
    FROM unified
    WHERE date IS NOT NULL
    GROUP BY month_start, month_label
    ORDER BY month_start
  ),
  status_counts AS (
    SELECT COALESCE(status, 'unknown') AS status,
      COUNT(*)::bigint AS count
    FROM unified
    GROUP BY status
  ),
  order_type_counts AS (
    SELECT COALESCE(order_type, 'unknown') AS order_type,
      COUNT(*)::bigint AS count,
      COALESCE(SUM(tons), 0)::numeric AS tons
    FROM unified
    GROUP BY order_type
  ),
  shift_counts AS (
    SELECT COALESCE(shift, 'unknown') AS shift,
      COUNT(*)::bigint AS count,
      COALESCE(SUM(tons), 0)::numeric AS tons
    FROM unified
    GROUP BY shift
  ),
  diameter_sums AS (
    SELECT
      COALESCE(SUM(breakdown_8mm), 0)::numeric AS mm8,
      COALESCE(SUM(breakdown_10mm), 0)::numeric AS mm10,
      COALESCE(SUM(breakdown_12mm), 0)::numeric AS mm12,
      COALESCE(SUM(breakdown_14mm), 0)::numeric AS mm14,
      COALESCE(SUM(breakdown_16mm), 0)::numeric AS mm16,
      COALESCE(SUM(breakdown_18mm), 0)::numeric AS mm18,
      COALESCE(SUM(breakdown_20mm), 0)::numeric AS mm20,
      COALESCE(SUM(breakdown_25mm), 0)::numeric AS mm25,
      COALESCE(SUM(breakdown_32mm), 0)::numeric AS mm32,
      COALESCE(SUM(tons), 0)::numeric AS total_order_tons
    FROM unified
  ),
  diameter_rows AS (
    SELECT * FROM (
      SELECT '8mm'::text AS diameter, mm8 AS tons FROM diameter_sums
      UNION ALL SELECT '10mm', mm10 FROM diameter_sums
      UNION ALL SELECT '12mm', mm12 FROM diameter_sums
      UNION ALL SELECT '14mm', mm14 FROM diameter_sums
      UNION ALL SELECT '16mm', mm16 FROM diameter_sums
      UNION ALL SELECT '18mm', mm18 FROM diameter_sums
      UNION ALL SELECT '20mm', mm20 FROM diameter_sums
      UNION ALL SELECT '25mm', mm25 FROM diameter_sums
      UNION ALL SELECT '32mm', mm32 FROM diameter_sums
    ) AS rows
  ),
  diameter_total AS (
    SELECT COALESCE(SUM(tons), 0)::numeric AS total_breakdown_tons
    FROM diameter_rows
  )
  SELECT jsonb_build_object(
    'monthly_tons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', month_label, 'tons', tons) ORDER BY month_start)
      FROM monthly
    ), '[]'::jsonb),
    'status_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'status', status,
          'count', count
        )
        ORDER BY count DESC
      )
      FROM status_counts
    ), '[]'::jsonb),
    'order_type_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'order_type', order_type,
          'count', count,
          'tons', tons
        )
        ORDER BY count DESC
      )
      FROM order_type_counts
    ), '[]'::jsonb),
    'shift_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'shift', shift,
          'count', count,
          'tons', tons
        )
        ORDER BY count DESC
      )
      FROM shift_counts
    ), '[]'::jsonb),
    'diameter_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'diameter', diameter,
          'tons', tons,
          'percentage', CASE WHEN (SELECT total_breakdown_tons FROM diameter_total) > 0
            THEN ROUND((tons / (SELECT total_breakdown_tons FROM diameter_total)) * 100, 3)
            ELSE 0 END
        )
        ORDER BY diameter
      )
      FROM diameter_rows
    ), '[]'::jsonb),
    'diameter_totals', jsonb_build_object(
      'total_breakdown_tons', (SELECT total_breakdown_tons FROM diameter_total),
      'total_order_tons', (SELECT total_order_tons FROM diameter_sums),
      'has_mismatch', ABS((SELECT total_breakdown_tons FROM diameter_total) - (SELECT total_order_tons FROM diameter_sums)) > 0.01
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_clients_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_orders_page(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_sites_performance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_site_summary(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_site_orders_page(uuid, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_analytics(uuid) TO authenticated;
