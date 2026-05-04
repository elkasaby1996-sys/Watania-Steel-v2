-- Backfill legacy rows that have no company/client into a single UNKNOWN client bucket.
-- This restores visibility on the Clients page for historical incomplete data.

DO $$
DECLARE
  v_unknown_client_id uuid;
  v_unknown_site_id uuid;
BEGIN
  -- Reuse existing UNKNOWN/UNKOWN client when present, otherwise create one.
  SELECT c.id
  INTO v_unknown_client_id
  FROM public.clients c
  WHERE upper(trim(c.name)) IN ('UNKNOWN', 'UNKOWN')
  ORDER BY CASE WHEN upper(trim(c.name)) = 'UNKNOWN' THEN 0 ELSE 1 END, c.created_at
  LIMIT 1;

  IF v_unknown_client_id IS NULL THEN
    INSERT INTO public.clients (name, name_normalized, created_at, updated_at)
    VALUES ('UNKNOWN', 'unknown', now(), now())
    RETURNING id INTO v_unknown_client_id;
  END IF;

  -- Optional generic site for rows that have no site value at all.
  SELECT s.id
  INTO v_unknown_site_id
  FROM public.client_sites s
  WHERE s.client_id = v_unknown_client_id
    AND upper(trim(s.name)) IN ('UNKNOWN', 'UNKOWN', 'UNKNOWN SITE')
  ORDER BY s.created_at
  LIMIT 1;

  IF v_unknown_site_id IS NULL THEN
    INSERT INTO public.client_sites (client_id, name, name_normalized, created_at, updated_at)
    VALUES (v_unknown_client_id, 'UNKNOWN SITE', 'unknownsite', now(), now())
    RETURNING id INTO v_unknown_site_id;
  END IF;

  -- Orders: attach missing company/client rows to UNKNOWN.
  UPDATE public.orders
  SET
    company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
    site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
    client_id = v_unknown_client_id,
    site_id = COALESCE(site_id, v_unknown_site_id)
  WHERE client_id IS NULL
    AND (
      company IS NULL
      OR NULLIF(trim(company), '') IS NULL
      OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN')
    );

  -- History: attach missing company/client rows to UNKNOWN.
  UPDATE public.history_orders
  SET
    company = COALESCE(NULLIF(trim(company), ''), 'UNKNOWN'),
    site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
    client_id = v_unknown_client_id,
    site_id = COALESCE(site_id, v_unknown_site_id)
  WHERE client_id IS NULL
    AND (
      company IS NULL
      OR NULLIF(trim(company), '') IS NULL
      OR upper(trim(company)) IN ('UNKNOWN', 'UNKOWN')
    );
END $$;
