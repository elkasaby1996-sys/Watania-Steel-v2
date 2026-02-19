-- Re-link client_id/site_id for existing orders/history rows using current company/site values.
-- This fixes stale mappings where company text was corrected but IDs still point to an old client
-- (for example typo buckets like "UNKOWN").

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'orders_set_client_site_ids'
  ) THEN
    UPDATE public.orders
    SET company = company
    WHERE NULLIF(trim(company), '') IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'history_orders_set_client_site_ids'
  ) THEN
    UPDATE public.history_orders
    SET company = company
    WHERE NULLIF(trim(company), '') IS NOT NULL;
  END IF;
END $$;
