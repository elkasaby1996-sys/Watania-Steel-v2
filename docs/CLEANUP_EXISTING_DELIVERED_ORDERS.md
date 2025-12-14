# Clean Up Existing Delivered Orders

## Since the table exists, run this to move existing delivered orders:

```sql
-- Check what's in both tables
SELECT 'Active Orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'History Orders' as table_name, COUNT(*) as count FROM history_orders;

-- Check delivered orders still in active table
SELECT id, customer_name, date, status, delivered_at 
FROM orders 
WHERE status = 'delivered'
ORDER BY date;

-- Move delivered orders to history (if any exist)
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
  COALESCE(delivered_at::date, date::date) as delivered_date,
  status, 
  COALESCE(amount, 0) as amount, 
  COALESCE(tons, 0) as tons, 
  COALESCE(shift, 'morning') as shift, 
  delivery_number, company, site, 
  driver_name, phone_number, delivered_at, 
  COALESCE(signed_delivery_note, false) as signed_delivery_note,
  COALESCE(order_type, 'straight-bar') as order_type,
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0),
  COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
FROM orders 
WHERE status = 'delivered'
ON CONFLICT (id) DO NOTHING;

-- Remove delivered orders from active orders
DELETE FROM orders WHERE status = 'delivered';

-- Final verification
SELECT 'Final Status' as info;
SELECT 'Active Orders' as table_name, COUNT(*) as count FROM orders WHERE status != 'delivered'
UNION ALL
SELECT 'History Orders' as table_name, COUNT(*) as count FROM history_orders;

-- Check if order #123 is now in history
SELECT 'Order 123 Location Check' as info;

-- Check in active orders
SELECT 'Active' as location, id, customer_name, date, status 
FROM orders WHERE id = '123';

-- Check in history orders  
SELECT 'History' as location, id, customer_name, original_date as date, status 
FROM history_orders WHERE id = '123';
```
