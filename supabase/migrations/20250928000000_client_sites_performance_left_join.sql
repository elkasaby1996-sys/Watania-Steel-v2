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

GRANT EXECUTE ON FUNCTION public.get_client_sites_performance(uuid) TO authenticated;
