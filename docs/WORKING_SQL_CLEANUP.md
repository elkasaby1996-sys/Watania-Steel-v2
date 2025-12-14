# Working SQL Cleanup - Copy Each Block Separately

## Run These SQL Commands One by One in Supabase SQL Editor:

### Step 1: Check Current State
```sql
SELECT COUNT(*) as active_orders_count FROM orders;
```

### Step 2: Check History Table
```sql
SELECT COUNT(*) as history_orders_count FROM history_orders;
```

### Step 3: See Delivered Orders in Active Table
```sql
SELECT id, customer_name, date, status FROM orders WHERE status = 'delivered';
```

### Step 4: Move Order #123 to History (if it exists in active)
```sql
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type
)
SELECT 
  id, 
  customer_name, 
  date, 
  CURRENT_DATE, 
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
  COALESCE(order_type, 'straight-bar')
FROM orders 
WHERE id = '123' AND status = 'delivered';
```

### Step 5: Remove Order #123 from Active Table
```sql
DELETE FROM orders WHERE id = '123' AND status = 'delivered';
```

### Step 6: Verify Order #123 is in History
```sql
SELECT id, customer_name, original_date, delivered_date, status FROM history_orders WHERE id = '123';
```

### Step 7: Clean Up Any Other Delivered Orders
```sql
INSERT INTO history_orders (
  id, customer_name, original_date, delivered_date, status, amount, tons, 
  shift, delivery_number, company, site, driver_name, phone_number, 
  delivered_at, signed_delivery_note, order_type
)
SELECT 
  id, 
  customer_name, 
  date, 
  CURRENT_DATE, 
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
  COALESCE(order_type, 'straight-bar')
FROM orders 
WHERE status = 'delivered';
```

### Step 8: Remove All Delivered Orders from Active Table
```sql
DELETE FROM orders WHERE status = 'delivered';
```

### Step 9: Final Verification
```sql
SELECT 'Active Orders' as table_type, COUNT(*) as count FROM orders;
```

```sql
SELECT 'History Orders' as table_type, COUNT(*) as count FROM history_orders;
```
