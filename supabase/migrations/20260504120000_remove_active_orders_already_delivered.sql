-- Remove stale active rows when the same delivery already exists as delivered history.
-- This keeps orders from appearing in both Active Orders and Delivery Archive.

DELETE FROM public.orders AS active_order
WHERE EXISTS (
  SELECT 1
  FROM public.history_orders AS history_order
  WHERE history_order.id = active_order.id
    AND history_order.status = 'delivered'
);
