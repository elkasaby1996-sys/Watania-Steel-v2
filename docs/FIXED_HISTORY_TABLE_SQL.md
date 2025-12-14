# Fixed SQL Commands for History Table

## Run This SQL in Supabase SQL Editor (Fixed Version)

```sql
-- Create separate history_orders table
CREATE TABLE IF NOT EXISTS history_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  original_date DATE NOT NULL, -- The date user specified for the order
  delivered_date DATE NOT NULL, -- The date it was actually delivered
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_history_orders_original_date ON history_orders(original_date);
CREATE INDEX IF NOT EXISTS idx_history_orders_delivered_date ON history_orders(delivered_date);
CREATE INDEX IF NOT EXISTS idx_history_orders_driver_name ON history_orders(driver_name);
CREATE INDEX IF NOT EXISTS idx_history_orders_status ON history_orders(status);

-- Enable RLS
ALTER TABLE history_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "Authenticated users can view history orders" ON history_orders;
DROP POLICY IF EXISTS "System can insert history orders" ON history_orders;

-- Create RLS policies (without IF NOT EXISTS)
CREATE POLICY "Authenticated users can view history orders" ON history_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert history orders" ON history_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the table was created
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'history_orders' 
ORDER BY ordinal_position;

-- Test the table
SELECT COUNT(*) as history_orders_count FROM history_orders;
```

## RECOMMENDED: Simple Version (No RLS)

Use this version to avoid policy syntax issues:

```sql
-- Create the history_orders table
CREATE TABLE IF NOT EXISTS history_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  original_date DATE NOT NULL,
  delivered_date DATE NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_history_orders_original_date ON history_orders(original_date);
CREATE INDEX IF NOT EXISTS idx_history_orders_delivered_date ON history_orders(delivered_date);
CREATE INDEX IF NOT EXISTS idx_history_orders_driver_name ON history_orders(driver_name);

-- Disable RLS for simplicity (enable later if needed)
ALTER TABLE history_orders DISABLE ROW LEVEL SECURITY;

-- Verify the table was created successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'history_orders' 
ORDER BY ordinal_position;

-- Test that we can query the table
SELECT COUNT(*) as history_orders_count FROM history_orders;
```

## After Running SQL:
1. Refresh your app
2. Try creating order #123 with an earlier date
3. Mark it as delivered
4. Check History - should appear under the original date

## Key Differences

### Fixed Issues:
- ✅ **Removed `IF NOT EXISTS`** from policy creation
- ✅ **Added `DROP POLICY IF EXISTS`** before creating policies
- ✅ **Alternative simple version** without RLS

### Table Structure:
- **`original_date`**: The date the user specified when creating the order
- **`delivered_date`**: The date it was actually marked as delivered
- **All other fields**: Same as orders table

Run either version of the SQL and the history table will be created properly!
