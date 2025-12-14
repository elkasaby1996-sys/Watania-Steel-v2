# Update Database Status Constraint

## Run This SQL to Fix Status Consistency:

```sql
-- First, update any existing orders with old status values
UPDATE orders SET status = 'delivered' WHERE status IN ('completed', 'delayed', 'pending');
UPDATE history_orders SET status = 'delivered' WHERE status IN ('completed', 'delayed', 'pending');

-- Update the constraint to only allow the two status values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('in-progress', 'delivered'));

-- Check current orders and their statuses
SELECT id, customer_name, date, status FROM orders ORDER BY date DESC;
SELECT id, customer_name, date, status FROM history_orders ORDER BY date DESC;

-- Move any delivered orders from active to history
INSERT INTO history_orders (
  id, customer_name, date, status, amount, tons, shift,
  delivery_number, company, site, driver_name, phone_number,
  delivered_at, signed_delivery_note, order_type,
  breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
  breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
)
SELECT 
  id, customer_name, date, 'delivered', 
  COALESCE(amount, 0), COALESCE(tons, 0), COALESCE(shift, 'morning'),
  delivery_number, company, site, driver_name, phone_number,
  COALESCE(delivered_at, NOW()), COALESCE(signed_delivery_note, false), COALESCE(order_type, 'straight-bar'),
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0)
FROM orders 
WHERE status = 'delivered'
ON CONFLICT (id) DO NOTHING;

-- Remove delivered orders from active table
DELETE FROM orders WHERE status = 'delivered';

-- Final verification
SELECT 'Active Orders (should be in-progress only)' as info;
SELECT id, customer_name, date, status FROM orders;

SELECT 'History Orders (should be delivered only)' as info;
SELECT id, customer_name, date, status FROM history_orders;
```
