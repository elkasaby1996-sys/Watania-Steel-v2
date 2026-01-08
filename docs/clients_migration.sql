-- Clients + Sites master data migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_normalized text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_normalized text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_sites_unique_name UNIQUE (client_id, name_normalized)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND constraint_name = 'clients_name_normalized_key'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_name_normalized_key UNIQUE (name_normalized);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN client_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'site_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN site_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'history_orders'
      AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.history_orders ADD COLUMN client_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'history_orders'
      AND column_name = 'site_id'
  ) THEN
    ALTER TABLE public.history_orders ADD COLUMN site_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'orders_client_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND constraint_name = 'orders_site_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.client_sites(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'history_orders'
      AND constraint_name = 'history_orders_client_id_fkey'
  ) THEN
    ALTER TABLE public.history_orders
      ADD CONSTRAINT history_orders_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'history_orders'
      AND constraint_name = 'history_orders_site_id_fkey'
  ) THEN
    ALTER TABLE public.history_orders
      ADD CONSTRAINT history_orders_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.client_sites(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_name_normalized ON public.clients (name_normalized);
CREATE INDEX IF NOT EXISTS idx_client_sites_client_id ON public.client_sites (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_site_id ON public.orders (site_id);
CREATE INDEX IF NOT EXISTS idx_history_orders_client_id ON public.history_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_history_orders_site_id ON public.history_orders (site_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_read" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_read" ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('viewer', 'editor', 'admin')
    )
  );

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

DROP POLICY IF EXISTS "client_sites_read" ON public.client_sites;
DROP POLICY IF EXISTS "client_sites_insert" ON public.client_sites;
DROP POLICY IF EXISTS "client_sites_update" ON public.client_sites;
DROP POLICY IF EXISTS "client_sites_delete" ON public.client_sites;

CREATE POLICY "client_sites_read" ON public.client_sites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('viewer', 'editor', 'admin')
    )
  );

CREATE POLICY "client_sites_insert" ON public.client_sites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "client_sites_update" ON public.client_sites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "client_sites_delete" ON public.client_sites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('editor', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.normalize_client_value(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(upper(trim(value)), '');
$$;

CREATE OR REPLACE FUNCTION public.ensure_client_site(company_value text, site_value text)
RETURNS TABLE (client_id uuid, site_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_company text;
  normalized_site text;
  client_record record;
  site_record record;
BEGIN
  normalized_company := public.normalize_client_value(company_value);

  IF normalized_company IS NULL THEN
    client_id := NULL;
    site_id := NULL;
    RETURN;
  END IF;

  INSERT INTO public.clients (name, name_normalized, updated_at)
  VALUES (trim(company_value), normalized_company, now())
  ON CONFLICT (name_normalized) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now()
  RETURNING id INTO client_record;

  IF client_record.id IS NULL THEN
    SELECT id INTO client_record
    FROM public.clients
    WHERE name_normalized = normalized_company
    LIMIT 1;
  END IF;

  client_id := client_record.id;

  normalized_site := public.normalize_client_value(site_value);
  IF normalized_site IS NULL THEN
    site_id := NULL;
    RETURN;
  END IF;

  INSERT INTO public.client_sites (client_id, name, name_normalized, updated_at)
  VALUES (client_record.id, trim(site_value), normalized_site, now())
  ON CONFLICT (client_id, name_normalized) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now()
  RETURNING id INTO site_record;

  IF site_record.id IS NULL THEN
    SELECT id INTO site_record
    FROM public.client_sites
    WHERE client_id = client_record.id
      AND name_normalized = normalized_site
    LIMIT 1;
  END IF;

  site_id := site_record.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_client_site_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  result record;
BEGIN
  SELECT * INTO result
  FROM public.ensure_client_site(NEW.company, NEW.site);

  NEW.client_id := result.client_id;
  NEW.site_id := result.site_id;

  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.backfill_client_sites()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.clients (name, name_normalized, created_at, updated_at)
  SELECT DISTINCT trim(company) AS name,
    public.normalize_client_value(company) AS name_normalized,
    now(),
    now()
  FROM (
    SELECT company FROM public.orders
    UNION ALL
    SELECT company FROM public.history_orders
  ) AS combined
  WHERE public.normalize_client_value(company) IS NOT NULL
  ON CONFLICT (name_normalized) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now();

  INSERT INTO public.client_sites (client_id, name, name_normalized, created_at, updated_at)
  SELECT DISTINCT c.id,
    trim(combined.site) AS name,
    public.normalize_client_value(combined.site) AS name_normalized,
    now(),
    now()
  FROM (
    SELECT company, site FROM public.orders
    UNION ALL
    SELECT company, site FROM public.history_orders
  ) AS combined
  JOIN public.clients c
    ON c.name_normalized = public.normalize_client_value(combined.company)
  WHERE public.normalize_client_value(combined.site) IS NOT NULL
  ON CONFLICT (client_id, name_normalized) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now();

  UPDATE public.orders o
  SET client_id = c.id,
      site_id = s.id
  FROM public.clients c
  LEFT JOIN public.client_sites s
    ON s.client_id = c.id
   AND s.name_normalized = public.normalize_client_value(o.site)
  WHERE o.client_id IS NULL
    AND public.normalize_client_value(o.company) = c.name_normalized;

  UPDATE public.history_orders ho
  SET client_id = c.id,
      site_id = s.id
  FROM public.clients c
  LEFT JOIN public.client_sites s
    ON s.client_id = c.id
   AND s.name_normalized = public.normalize_client_value(ho.site)
  WHERE ho.client_id IS NULL
    AND public.normalize_client_value(ho.company) = c.name_normalized;
END;
$$;

SELECT public.backfill_client_sites();

CREATE OR REPLACE FUNCTION public.get_clients_summary(search_text text DEFAULT NULL)
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
  WITH combined AS (
    SELECT client_id, site_id, date, tons
    FROM public.orders
    WHERE client_id IS NOT NULL
    UNION ALL
    SELECT client_id, site_id, date, tons
    FROM public.history_orders
    WHERE client_id IS NOT NULL
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
  FROM public.clients c
  LEFT JOIN aggregated a ON a.client_id = c.id
  WHERE search_text IS NULL OR c.name ILIKE '%' || search_text || '%'
  ORDER BY total_tons DESC, c.name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_client_summary(client_id uuid)
RETURNS TABLE (
  total_orders bigint,
  total_tons numeric,
  total_amount numeric,
  unique_sites bigint,
  last_order_date date
)
LANGUAGE sql
STABLE
AS $$
  WITH combined AS (
    SELECT client_id, site_id, date, tons, amount
    FROM public.orders
    WHERE client_id = get_client_summary.client_id
    UNION ALL
    SELECT client_id, site_id, date, tons, amount
    FROM public.history_orders
    WHERE client_id = get_client_summary.client_id
  )
  SELECT COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(tons), 0)::numeric AS total_tons,
    COALESCE(SUM(amount), 0)::numeric AS total_amount,
    COUNT(DISTINCT site_id)::bigint AS unique_sites,
    MAX(date) AS last_order_date
  FROM combined;
$$;

CREATE OR REPLACE FUNCTION public.get_client_orders_page(
  client_id uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
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
    SELECT id, date, status, amount, tons, company, site, order_type, shift, delivered_at,
      signed_delivery_note, delivery_number, driver_name, phone_number, customer_name,
      'orders'::text AS source
    FROM public.orders
    WHERE client_id = get_client_orders_page.client_id
    UNION ALL
    SELECT id, date, status, amount, tons, company, site, order_type, shift, delivered_at,
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
  total_orders bigint,
  total_tons numeric,
  total_amount numeric,
  last_order_date date
)
LANGUAGE sql
STABLE
AS $$
  WITH combined AS (
    SELECT site_id, date, tons, amount
    FROM public.orders
    WHERE client_id = get_client_sites_performance.client_id
      AND site_id IS NOT NULL
    UNION ALL
    SELECT site_id, date, tons, amount
    FROM public.history_orders
    WHERE client_id = get_client_sites_performance.client_id
      AND site_id IS NOT NULL
  )
  SELECT s.id AS site_id,
    s.name AS site_name,
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(combined.tons), 0)::numeric AS total_tons,
    COALESCE(SUM(combined.amount), 0)::numeric AS total_amount,
    MAX(combined.date) AS last_order_date
  FROM combined
  JOIN public.client_sites s ON s.id = combined.site_id
  GROUP BY s.id, s.name
  ORDER BY total_tons DESC, site_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_client_analytics(client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH unified AS (
    SELECT date, status, order_type, shift, amount, tons,
      breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
      breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
    FROM public.orders
    WHERE client_id = get_client_analytics.client_id
    UNION ALL
    SELECT date, status, order_type, shift, amount, tons,
      breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
      breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
    FROM public.history_orders
    WHERE client_id = get_client_analytics.client_id
  ),
  monthly AS (
    SELECT date_trunc('month', date)::date AS month_start,
      to_char(date_trunc('month', date), 'Mon YY') AS month_label,
      COALESCE(SUM(tons), 0)::numeric AS tons,
      COALESCE(SUM(amount), 0)::numeric AS amount
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
      COALESCE(SUM(tons), 0)::numeric AS tons,
      COALESCE(SUM(amount), 0)::numeric AS amount
    FROM unified
    GROUP BY order_type
  ),
  shift_counts AS (
    SELECT COALESCE(shift, 'unknown') AS shift,
      COUNT(*)::bigint AS count,
      COALESCE(SUM(tons), 0)::numeric AS tons,
      COALESCE(SUM(amount), 0)::numeric AS amount
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
    'monthly_amount', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', month_label, 'amount', amount) ORDER BY month_start)
      FROM monthly
    ), '[]'::jsonb),
    'status_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'status', status,
          'count', count,
          'percentage', CASE WHEN (SELECT SUM(count) FROM status_counts) > 0
            THEN ROUND((count::numeric / (SELECT SUM(count) FROM status_counts)) * 100, 3)
            ELSE 0 END
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
          'tons', tons,
          'amount', amount
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
          'tons', tons,
          'amount', amount
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
