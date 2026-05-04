-- Map unknown-company variants (e.g. "Unknown Customer") to canonical UNKNOWN client/site.
-- Safe to run multiple times.

DO $$
DECLARE
  v_unknown_client_id uuid;
  v_unknown_site_id uuid;
BEGIN
  -- Ensure canonical UNKNOWN client exists.
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

  -- Ensure UNKNOWN SITE exists under UNKNOWN.
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

  -- Helper predicate inline:
  -- Normalize company to uppercase alnum and match common unknown variants.
  UPDATE public.orders o
  SET company = COALESCE(NULLIF(trim(o.company), ''), 'UNKNOWN'),
      site = COALESCE(NULLIF(trim(o.site), ''), 'UNKNOWN SITE'),
      client_id = v_unknown_client_id,
      site_id = COALESCE(o.site_id, v_unknown_site_id),
      updated_at = now()
  WHERE o.client_id IS NULL
    AND (
      o.company IS NULL
      OR NULLIF(trim(o.company), '') IS NULL
      OR upper(regexp_replace(o.company, '[^A-Za-z0-9]+', '', 'g')) IN (
        'UNKNOWN', 'UNKOWN', 'UNKNOWNCUSTOMER', 'UNKNOWNCLIENT', 'UNKNOWNCOMPANY',
        'NA', 'NACUSTOMER', 'NONE'
      )
      OR o.company ILIKE 'unknown%'
    );

  UPDATE public.history_orders h
  SET company = COALESCE(NULLIF(trim(h.company), ''), 'UNKNOWN'),
      site = COALESCE(NULLIF(trim(h.site), ''), 'UNKNOWN SITE'),
      client_id = v_unknown_client_id,
      site_id = COALESCE(h.site_id, v_unknown_site_id),
      updated_at = now()
  WHERE h.client_id IS NULL
    AND (
      h.company IS NULL
      OR NULLIF(trim(h.company), '') IS NULL
      OR upper(regexp_replace(h.company, '[^A-Za-z0-9]+', '', 'g')) IN (
        'UNKNOWN', 'UNKOWN', 'UNKNOWNCUSTOMER', 'UNKNOWNCLIENT', 'UNKNOWNCOMPANY',
        'NA', 'NACUSTOMER', 'NONE'
      )
      OR h.company ILIKE 'unknown%'
    );
END $$;
