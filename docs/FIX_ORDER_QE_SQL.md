# Fix Order QE - Run This SQL

## Move Order QE to History with Correct Date

```sql
-- Move order 'qe' to history with the date you originally wanted
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type,
  breakdown_8mm, breakdown_10mm, breakdown_12mm, breakdown_14mm, breakdown_16mm,
  breakdown_18mm, breakdown_20mm, breakdown_25mm, breakdown_32mm
)
SELECT 
  'qe', 
  customer_name, 
  '2025-09-20' as original_date,
  CURRENT_DATE as delivered_date,
  'delivered', 
  COALESCE(amount, 0), 
  COALESCE(tons, 0), 
  COALESCE(shift, 'morning'), 
  delivery_number, 
  company, 
  site, 
  driver_name, 
  phone_number, 
  NOW(), 
  COALESCE(signed_delivery_note, false),
  COALESCE(order_type, 'straight-bar'),
  COALESCE(breakdown_8mm, 0), COALESCE(breakdown_10mm, 0), COALESCE(breakdown_12mm, 0),
  COALESCE(breakdown_14mm, 0), COALESCE(breakdown_16mm, 0), COALESCE(breakdown_18mm, 0),
  COALESCE(breakdown_20mm, 0), COALESCE(breakdown_25mm, 0), COALESCE(breakdown_32mm, 0)
FROM orders 
WHERE id = 'qe'
ON CONFLICT (id) DO NOTHING;
```

```sql
-- Remove from active orders
DELETE FROM orders WHERE id = 'qe';
```

```sql
-- Verify it worked
SELECT id, customer_name, original_date, delivered_date FROM history_orders WHERE id = 'qe';
```
