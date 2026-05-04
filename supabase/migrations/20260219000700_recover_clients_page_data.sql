-- Recovery pass for client/site links after relink rollout.
-- Safe to run multiple times.

DO $$
BEGIN
  -- Prefer canonical backfill when available.
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'backfill_client_sites'
      AND pg_function_is_visible(oid)
  ) THEN
    PERFORM public.backfill_client_sites();
  END IF;

  -- Re-run linking on rows that are still missing IDs.
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'orders_set_client_site_ids'
  ) THEN
    UPDATE public.orders
    SET company = company
    WHERE NULLIF(trim(company), '') IS NOT NULL
      AND (client_id IS NULL OR site_id IS NULL);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'history_orders_set_client_site_ids'
  ) THEN
    UPDATE public.history_orders
    SET company = company
    WHERE NULLIF(trim(company), '') IS NOT NULL
      AND (client_id IS NULL OR site_id IS NULL);
  END IF;
END $$;
