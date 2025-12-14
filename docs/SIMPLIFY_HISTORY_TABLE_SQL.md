# Simplify History Table - Single Date Field

## Run This SQL to Fix the History Table:

```sql
-- Drop the existing history table and recreate with single date
DROP TABLE IF EXISTS history_orders;

-- Create simplified history_orders table with single date field
CREATE TABLE history_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  date DATE NOT NULL, -- Single date field - the original order date
  status TEXT NOT NULL DEFAULT 'delivered',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tons DECIMAL(8,2) NOT NULL DEFAULT 0,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  delivery_number TEXT,
  company TEXT,
  site TEXT,
  driver_name TEXT,
  phone_number TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  signed_delivery_note BOOLEAN DEFAULT FALSE,
  order_type TEXT DEFAULT 'straight-bar' CHECK (order_type IN ('straight-bar', 'cut-and-bend')),
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
CREATE INDEX idx_history_orders_date ON history_orders(date);
CREATE INDEX idx_history_orders_driver_name ON history_orders(driver_name);

-- Disable RLS for simplicity
ALTER TABLE history_orders DISABLE ROW LEVEL SECURITY;

-- Re-insert the orders with correct dates
INSERT INTO history_orders (
  id, customer_name, date, status, amount, tons, shift,
  delivery_number, company, site, driver_name, phone_number,
  delivered_at, signed_delivery_note, order_type
) VALUES 
('123', '456', '2025-09-25', 'delivered', 0, 0, 'morning', '123', '', '', '', '', NOW(), false, 'straight-bar'),
('qe', '4534', '2025-09-20', 'delivered', 0, 0, 'morning', 'qe', '', '', '', '', NOW(), false, 'straight-bar');

-- Verify the data
SELECT id, customer_name, date, status FROM history_orders ORDER BY date DESC;
```

## This Simplifies Everything:
- ✅ **Single `date` field** - the original order date user specified
- ✅ **No confusion** between original_date and delivered_date
- ✅ **Clean data model** - same as active orders table
- ✅ **Easy grouping** by the single date field
