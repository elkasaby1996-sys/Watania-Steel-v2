-- Make merge_clients resilient to site collisions when merging duplicate clients.
-- This replaces the function with a conflict-safe implementation.

CREATE OR REPLACE FUNCTION public.merge_clients(
  p_primary_client_id uuid,
  p_duplicate_client_id uuid,
  p_new_primary_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_updated bigint := 0;
  v_history_updated bigint := 0;
  v_sites_reassigned bigint := 0;
  v_sites_merged bigint := 0;
  v_rows bigint := 0;
  v_duplicate_deleted boolean := false;
  v_primary_renamed boolean := false;
  v_target_site_id uuid;
  v_site_key text;
  v_duplicate_site record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_primary_client_id = p_duplicate_client_id THEN
    RAISE EXCEPTION 'Primary and duplicate client IDs must be different';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_primary_client_id) THEN
    RAISE EXCEPTION 'Primary client not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_duplicate_client_id) THEN
    RAISE EXCEPTION 'Duplicate client not found';
  END IF;

  -- Move each duplicate site. If moving client_id conflicts with a unique key,
  -- merge that site into the matching primary site and repoint order references.
  FOR v_duplicate_site IN
    SELECT id, name, name_normalized
    FROM public.client_sites
    WHERE client_id = p_duplicate_client_id
  LOOP
    v_target_site_id := NULL;
    v_site_key := COALESCE(
      NULLIF(v_duplicate_site.name_normalized, ''),
      lower(regexp_replace(COALESCE(v_duplicate_site.name, ''), '[^a-z0-9]+', '', 'g'))
    );

    BEGIN
      UPDATE public.client_sites
      SET client_id = p_primary_client_id
      WHERE id = v_duplicate_site.id;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_sites_reassigned := v_sites_reassigned + v_rows;

      UPDATE public.orders
      SET client_id = p_primary_client_id
      WHERE client_id = p_duplicate_client_id
        AND site_id = v_duplicate_site.id;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_orders_updated := v_orders_updated + v_rows;

      UPDATE public.history_orders
      SET client_id = p_primary_client_id
      WHERE client_id = p_duplicate_client_id
        AND site_id = v_duplicate_site.id;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_history_updated := v_history_updated + v_rows;

    EXCEPTION
      WHEN unique_violation THEN
        SELECT s.id
        INTO v_target_site_id
        FROM public.client_sites s
        WHERE s.client_id = p_primary_client_id
          AND (
            (v_site_key <> '' AND COALESCE(NULLIF(s.name_normalized, ''), lower(regexp_replace(COALESCE(s.name, ''), '[^a-z0-9]+', '', 'g'))) = v_site_key)
            OR (v_site_key = '' AND COALESCE(s.name, '') = COALESCE(v_duplicate_site.name, ''))
          )
        ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT 1;

        IF v_target_site_id IS NULL THEN
          RAISE EXCEPTION 'Site merge conflict for site "%" (id: %) and no matching primary site found',
            COALESCE(v_duplicate_site.name, '<unnamed>'),
            v_duplicate_site.id;
        END IF;

        UPDATE public.orders
        SET client_id = p_primary_client_id,
            site_id = v_target_site_id
        WHERE client_id = p_duplicate_client_id
          AND site_id = v_duplicate_site.id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        v_orders_updated := v_orders_updated + v_rows;

        UPDATE public.history_orders
        SET client_id = p_primary_client_id,
            site_id = v_target_site_id
        WHERE client_id = p_duplicate_client_id
          AND site_id = v_duplicate_site.id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        v_history_updated := v_history_updated + v_rows;

        DELETE FROM public.client_sites
        WHERE id = v_duplicate_site.id;
        IF FOUND THEN
          v_sites_merged := v_sites_merged + 1;
        END IF;
    END;
  END LOOP;

  -- Move any remaining duplicate-client rows that do not reference a site.
  UPDATE public.orders
  SET client_id = p_primary_client_id
  WHERE client_id = p_duplicate_client_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_orders_updated := v_orders_updated + v_rows;

  UPDATE public.history_orders
  SET client_id = p_primary_client_id
  WHERE client_id = p_duplicate_client_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_history_updated := v_history_updated + v_rows;

  IF p_new_primary_name IS NOT NULL AND length(trim(p_new_primary_name)) > 0 THEN
    UPDATE public.clients
    SET name = p_new_primary_name,
        name_normalized = lower(regexp_replace(p_new_primary_name, '[^a-z0-9]+', '', 'g')),
        updated_at = NOW()
    WHERE id = p_primary_client_id;
    v_primary_renamed := true;
  END IF;

  DELETE FROM public.clients
  WHERE id = p_duplicate_client_id;
  v_duplicate_deleted := FOUND;

  RETURN jsonb_build_object(
    'primary_client_id', p_primary_client_id,
    'duplicate_client_id', p_duplicate_client_id,
    'orders_updated', v_orders_updated,
    'history_orders_updated', v_history_updated,
    'sites_updated', v_sites_reassigned + v_sites_merged,
    'sites_reassigned', v_sites_reassigned,
    'sites_merged', v_sites_merged,
    'primary_renamed', v_primary_renamed,
    'duplicate_deleted', v_duplicate_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_clients(uuid, uuid, text) TO authenticated;

