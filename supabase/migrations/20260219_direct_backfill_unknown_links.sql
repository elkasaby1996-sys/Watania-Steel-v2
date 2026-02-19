-- Directly backfill unknown-company rows by resolving IDs from ensure_client_site()
-- and writing client_id/site_id explicitly (does not depend on triggers).

DO $$
BEGIN
  -- Normalize unknown text first.
  UPDATE public.orders
  SET company = 'UNKNOWN',
      site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
      updated_at = now()
  WHERE client_id IS NULL
    AND (
      company IS NULL
      OR NULLIF(trim(company), '') IS NULL
      OR company ILIKE 'unknown%'
      OR upper(regexp_replace(company, '[^A-Za-z0-9]+', '', 'g')) IN (
        'UNKNOWN', 'UNKOWN', 'UNKNOWNCUSTOMER', 'UNKNOWNCLIENT', 'UNKNOWNCOMPANY',
        'NA', 'NACUSTOMER', 'NONE'
      )
    );

  UPDATE public.history_orders
  SET company = 'UNKNOWN',
      site = COALESCE(NULLIF(trim(site), ''), 'UNKNOWN SITE'),
      updated_at = now()
  WHERE client_id IS NULL
    AND (
      company IS NULL
      OR NULLIF(trim(company), '') IS NULL
      OR company ILIKE 'unknown%'
      OR upper(regexp_replace(company, '[^A-Za-z0-9]+', '', 'g')) IN (
        'UNKNOWN', 'UNKOWN', 'UNKNOWNCUSTOMER', 'UNKNOWNCLIENT', 'UNKNOWNCOMPANY',
        'NA', 'NACUSTOMER', 'NONE'
      )
    );

  -- Backfill orders with resolved IDs.
  WITH resolved AS (
    SELECT
      o.id,
      COALESCE(
        (j ->> 'client_id')::uuid,
        (j ->> 'out_client_id')::uuid
      ) AS resolved_client_id,
      COALESCE(
        (j ->> 'site_id')::uuid,
        (j ->> 'out_site_id')::uuid
      ) AS resolved_site_id
    FROM public.orders o
    CROSS JOIN LATERAL (
      SELECT to_jsonb(r) AS j
      FROM public.ensure_client_site(o.company, o.site) AS r
      LIMIT 1
    ) s
    WHERE o.client_id IS NULL
      AND o.company = 'UNKNOWN'
  )
  UPDATE public.orders o
  SET client_id = r.resolved_client_id,
      site_id = COALESCE(r.resolved_site_id, o.site_id),
      updated_at = now()
  FROM resolved r
  WHERE o.id = r.id
    AND r.resolved_client_id IS NOT NULL;

  -- Backfill history_orders with resolved IDs.
  WITH resolved AS (
    SELECT
      h.id,
      COALESCE(
        (j ->> 'client_id')::uuid,
        (j ->> 'out_client_id')::uuid
      ) AS resolved_client_id,
      COALESCE(
        (j ->> 'site_id')::uuid,
        (j ->> 'out_site_id')::uuid
      ) AS resolved_site_id
    FROM public.history_orders h
    CROSS JOIN LATERAL (
      SELECT to_jsonb(r) AS j
      FROM public.ensure_client_site(h.company, h.site) AS r
      LIMIT 1
    ) s
    WHERE h.client_id IS NULL
      AND h.company = 'UNKNOWN'
  )
  UPDATE public.history_orders h
  SET client_id = r.resolved_client_id,
      site_id = COALESCE(r.resolved_site_id, h.site_id),
      updated_at = now()
  FROM resolved r
  WHERE h.id = r.id
    AND r.resolved_client_id IS NOT NULL;
END $$;
