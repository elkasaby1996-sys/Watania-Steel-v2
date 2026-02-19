-- Fix trigger mapping when ensure_client_site returns out_client_id/out_site_id
-- instead of client_id/site_id. This keeps compatibility with both signatures.

CREATE OR REPLACE FUNCTION public.set_client_site_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  result_json jsonb;
BEGIN
  SELECT to_jsonb(r)
  INTO result_json
  FROM public.ensure_client_site(NEW.company, NEW.site) AS r
  LIMIT 1;

  NEW.client_id := COALESCE(
    (result_json ->> 'client_id')::uuid,
    (result_json ->> 'out_client_id')::uuid,
    NEW.client_id
  );

  NEW.site_id := COALESCE(
    (result_json ->> 'site_id')::uuid,
    (result_json ->> 'out_site_id')::uuid,
    NEW.site_id
  );

  RETURN NEW;
END;
$$;
