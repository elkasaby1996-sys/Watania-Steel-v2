# Simple Cleanup SQL - Copy This Exactly

## Run This SQL in Supabase SQL Editor:

```sql
-- Step 1: Check current state
SELECT COUNT(*) as active_orders_count FROM orders;
SELECT COUNT(*) as history_orders_count FROM history_orders;

-- Step 2: Check delivered orders still in active table
SELECT id, customer_name, date, status 
FROM orders 
WHERE status = 'delivered';

-- Step 3: Move delivered orders to history
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type,
  breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
  breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm,
  created_at, updated_at
)
SELECT 
  id, 
  customer_name, 
  date as original_date, 
  CURRENT_DATE as delivered_date,
  status, 
  COALESCE(amount, 0), 
  COALESCE(tons, 0), 
  COALESCE(shift, 'morning'), 
  delivery_number, 
  company, 
  site, 
  driver_name, 
  phone_number, 
  COALESCE(delivered_at, NOW()), 
  COALESCE(signed_delivery_note, false),
  COALESCE(order_type, 'straight-bar'),
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0),
  COALESCE(created_at, NOW()), 
  NOW()
FROM orders 
WHERE status = 'delivered';

-- Step 4: Remove delivered orders from active table
DELETE FROM orders WHERE status = 'delivered';

-- Step 5: Verify the move worked
SELECT COUNT(*) as remaining_active_orders FROM orders;
SELECT COUNT(*) as total_history_orders FROM history_orders;

-- Step 6: Check if order #123 is in history now
SELECT id, customer_name, original_date, delivered_date, status 
FROM history_orders 
WHERE id = '123';

-- Step 7: If order #123 is still in active orders, manually move it
-- First check if it's still there
SELECT 'Order 123 in active table:' as info;
SELECT id, customer_name, date, status FROM orders WHERE id = '123';

-- If it exists in active orders, move it manually
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type,
  breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
  breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm,
  created_at, updated_at
)
SELECT 
  '123', 
  customer_name, 
  date as original_date, 
  CURRENT_DATE as delivered_date,
  'delivered' as status, 
  COALESCE(amount, 0), 
  COALESCE(tons, 0), 
  COALESCE(shift, 'morning'), 
  delivery_number, 
  company, 
  site, 
  driver_name, 
  phone_number, 
  NOW() as delivered_at, 
  COALESCE(signed_delivery_note, false),
  COALESCE(order_type, 'straight-bar'),
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0),
  COALESCE(created_at, NOW()), 
  NOW()
FROM orders 
WHERE id = '123' AND status = 'delivered'
ON CONFLICT (id) DO NOTHING;

-- Remove order #123 from active orders
DELETE FROM orders WHERE id = '123' AND status = 'delivered';

-- Final check
SELECT 'Final Check - Order 123:' as info;
SELECT 'History Table' as location, id, customer_name, original_date, status FROM history_orders WHERE id = '123';
```

## This Will:
1. ✅ **Show current counts** in both tables
2. ✅ **List delivered orders** still in active table
3. ✅ **Move them to history** with proper date preservation
4. ✅ **Clean up active table** 
5. ✅ **Verify order #123** is now in history
