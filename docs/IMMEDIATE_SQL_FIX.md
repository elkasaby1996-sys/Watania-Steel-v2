# IMMEDIATE SQL FIX - Copy and Paste This Exactly

## Run This SQL in Supabase SQL Editor RIGHT NOW:

```sql
-- Create the history_orders table
CREATE TABLE history_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  original_date DATE NOT NULL,
  delivered_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tons DECIMAL(8,2) NOT NULL DEFAULT 0,
  shift TEXT NOT NULL,
  delivery_number TEXT,
  company TEXT,
  site TEXT,
  driver_name TEXT,
  phone_number TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  signed_delivery_note BOOLEAN DEFAULT FALSE,
  order_type TEXT DEFAULT 'straight-bar',
  breakdown_8mm DECIMAL(8,2) DEFAULT 0,
  breakdown_10mm DECIMAL(8,2) DEFAULT 0,
  breakdown_12mm DECIMAL(8,2) DEFAULT 0,
  breakdown_14mm DECIMAL(8,2) DEFAULT 0,
  breakdown_16mm DECIMAL(8,2) DEFAULT 0,
  breakdown_18mm DECIMAL(8,2) DEFAULT 0,
  breakdown_20mm DECIMAL(8,2) DEFAULT 0,
  breakdown_25mm DECIMAL(8,2) DEFAULT 0,
  breakdown_32mm DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_history_orders_original_date ON history_orders(original_date);
CREATE INDEX idx_history_orders_delivered_date ON history_orders(delivered_date);

-- Disable RLS for simplicity
ALTER TABLE history_orders DISABLE ROW LEVEL SECURITY;

-- Move existing delivered orders to history table
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
WHERE status = 'delivered';

-- Remove delivered orders from active orders table
DELETE FROM orders WHERE status = 'delivered';

-- Verify the migration worked
SELECT 'Migration completed' as status;
SELECT COUNT(*) as active_orders_count FROM orders;
SELECT COUNT(*) as history_orders_count FROM history_orders;
```

## This Will:
1. ✅ **Create history_orders table**
2. ✅ **Move existing delivered orders** (like #123) to history table
3. ✅ **Remove delivered orders** from active orders table
4. ✅ **Preserve original dates** in history table
5. ✅ **Clean up the data** automatically
