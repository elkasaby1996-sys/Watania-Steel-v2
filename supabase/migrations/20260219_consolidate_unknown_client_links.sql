-- Consolidate unknown-like client links into one canonical UNKNOWN client.
-- This catches legacy typo buckets (e.g. UNKOWN) and blank-company rows.

DO $$
DECLARE
  v_unknown_client_id uuid;
  v_unknown_site_id uuid;
BEGIN
  -- Canonical UNKNOWN client (reuse if exists, create if missing).
  SELECT c.id
  INTO v_unknown_client_id
  FROM public.clients c
  WHERE c.name_normalized IN ('unknown', 'unkown')
     OR upper(trim(c.name)) IN ('UNKNOWN', 'UNKOWN')
  ORDER BY CASE WHEN c.name_normalized = 'unknown' THEN 0 ELSE 1 END, c.created_at
  LIMIT 1;

  IF v_unknown_client_id IS NULL THEN
    INSERT INTO public.clients (name, name_normalized, created_at, updated_at)
    VALUES ('UNKNOWN', 'unknown', now(), now())
    RETURNING id INTO v_unknown_client_id;
  END IF;

  UPDATE public.clients
  SET name = 'UNKNOWN',
      name_normalized = 'unknown',
      updated_at = now()
  WHERE id = v_unknown_client_id;

  -- Generic site for unknown rows.
  SELECT s.id
  INTO v_unknown_site_id
  FROM public.client_sites s
  WHERE s.client_id = v_unknown_client_id
    AND s.name_normalized IN ('unknownsite', 'unknown', 'unkown')
  ORDER BY s.created_at
  LIMIT 1;

  IF v_unknown_site_id IS NULL THEN
    INSERT INTO public.client_sites (client_id, name, name_normalized, created_at, updated_at)
    VALUES (v_unknown_client_id, 'UNKNOWN SITE', 'unknownsite', now(), now())
    ON CONFLICT (client_id, name_normalized) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = now()
    RETURNING id INTO v_unknown_site_id;
  END IF;

  -- Move rows currently linked to unknown-like duplicate clients.
  UPDATE public.orders o
  SET client_id = v_unknown_client_id,
      site_id = COALESCE(o.site_id, v_unknown_site_id),
      updated_at = now()
  WHERE o.client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.id <> v_unknown_client_id
      AND (
        c.name_normalized IN ('unknown', 'unkown')
        OR upper(trim(c.name)) IN ('UNKNOWN', 'UNKOWN')
      )
  );

  UPDATE public.history_orders h
  SET client_id = v_unknown_client_id,
      site_id = COALESCE(h.site_id, v_unknown_site_id),
      updated_at = now()
  WHERE h.client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.id <> v_unknown_client_id
      AND (
        c.name_normalized IN ('unknown', 'unkown')
        OR upper(trim(c.name)) IN ('UNKNOWN', 'UNKOWN')
      )
  );

  -- Also map blank/unknown-company rows to canonical UNKNOWN.
  UPDATE public.orders
  SET company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
      site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
      client_id = v_unknown_client_id,
      site_id = COALESCE(site_id, v_unknown_site_id),
      updated_at = now()
  WHERE company IS NULL
     OR NULLIF(trim(company), '') IS NULL
     OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN');

  UPDATE public.history_orders
  SET company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
      site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
      client_id = v_unknown_client_id,
      site_id = COALESCE(site_id, v_unknown_site_id),
      updated_at = now()
  WHERE company IS NULL
     OR NULLIF(trim(company), '') IS NULL
     OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN');
END $$;
