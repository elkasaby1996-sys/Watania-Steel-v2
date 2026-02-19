-- Ensure UNKNOWN client always exists and legacy unknown/blank-company rows point to it.
-- This guarantees UNKNOWN appears in Clients UI summaries.

DO $$
DECLARE
  v_unknown_client_id uuid;
  v_unknown_site_id uuid;
BEGIN
  -- 1) Ensure UNKNOWN client exists (prefer an existing UNKNOWN/UNKOWN row).
  SELECT c.id
  INTO v_unknown_client_id
  FROM public.clients c
  WHERE upper(trim(c.name)) IN ('UNKNOWN', 'UNKOWN')
  ORDER BY CASE WHEN upper(trim(c.name)) = 'UNKNOWN' THEN 0 ELSE 1 END, c.created_at
  LIMIT 1;

  IF v_unknown_client_id IS NULL THEN
    INSERT INTO public.clients (name, name_normalized, created_at, updated_at)
    VALUES ('UNKNOWN', 'unknown', now(), now())
    ON CONFLICT (name_normalized) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = now()
    RETURNING id INTO v_unknown_client_id;
  END IF;

  -- Normalize visible name to UNKNOWN.
  UPDATE public.clients
  SET name = 'UNKNOWN',
      updated_at = now()
  WHERE id = v_unknown_client_id;

  -- 2) Ensure a generic site exists for unknown rows.
  SELECT s.id
  INTO v_unknown_site_id
  FROM public.client_sites s
  WHERE s.client_id = v_unknown_client_id
    AND upper(trim(s.name)) IN ('UNKNOWN SITE', 'UNKNOWN', 'UNKOWN')
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

  -- 3) Force unknown/blank-company rows into the UNKNOWN client bucket.
  UPDATE public.orders
  SET
    company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
    site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
    client_id = v_unknown_client_id,
    site_id = COALESCE(site_id, v_unknown_site_id),
    updated_at = now()
  WHERE
    company IS NULL
    OR NULLIF(trim(company), '') IS NULL
    OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN');

  UPDATE public.history_orders
  SET
    company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
    site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
    client_id = v_unknown_client_id,
    site_id = COALESCE(site_id, v_unknown_site_id),
    updated_at = now()
  WHERE
    company IS NULL
    OR NULLIF(trim(company), '') IS NULL
    OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN');
END $$;
