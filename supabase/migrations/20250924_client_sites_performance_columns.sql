-- Extend client_sites performance RPC with location and maps fields
CREATE OR REPLACE FUNCTION public.get_client_sites_performance(client_id uuid)
RETURNS TABLE (
  site_id uuid,
  site_name text,
  contact_name text,
  contact_phone text,
  location_text text,
  google_maps_url text,
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
    s.location_text,
    s.google_maps_url,
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(combined.tons), 0)::numeric AS total_tons,
    MAX(combined.date) AS last_order_date
  FROM combined
  JOIN public.client_sites s ON s.id = combined.site_id
  GROUP BY s.id, s.name, s.contact_name, s.contact_phone, s.location_text, s.google_maps_url
  ORDER BY total_tons DESC, site_name ASC;
$$;
