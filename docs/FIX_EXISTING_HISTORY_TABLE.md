# Fix Existing History Table

## The table exists, but orders aren't moving. Run this SQL:

```sql
-- Check what's currently in the history table
SELECT COUNT(*) as history_count FROM history_orders;
SELECT * FROM history_orders LIMIT 5;

-- Check what delivered orders are still in active orders table
SELECT id, customer_name, date, status FROM orders WHERE status = 'delivered';

-- Move any delivered orders from orders to history_orders
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type,
  breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
  breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm,
  created_at, updated_at
)
SELECT 
  id, customer_name, date as original_date, 
  COALESCE(delivered_at::date, CURRENT_DATE) as delivered_date,
  status, amount, tons, shift, delivery_number, company, site, 
  driver_name, phone_number, delivered_at, 
  COALESCE(signed_delivery_note, false) as signed_delivery_note,
  COALESCE(order_type, 'straight-bar') as order_type,
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0),
  created_at, updated_at
FROM orders 
WHERE status = 'delivered'
ON CONFLICT (id) DO NOTHING;

-- Remove delivered orders from active orders table
DELETE FROM orders WHERE status = 'delivered';

-- Verify the cleanup
SELECT 'Cleanup completed' as status;
SELECT COUNT(*) as active_orders FROM orders;
SELECT COUNT(*) as history_orders FROM history_orders;

-- Check if order #123 is now in history
SELECT id, customer_name, original_date, delivered_date, status 
FROM history_orders 
WHERE id = '123';
```
