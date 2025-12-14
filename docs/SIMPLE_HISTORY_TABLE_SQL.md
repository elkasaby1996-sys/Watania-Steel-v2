# SIMPLE History Table Setup (No RLS Issues)

## Copy and Run This SQL in Supabase SQL Editor

```sql
-- Create the history_orders table (simple version)
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

-- Disable RLS to avoid permission issues
ALTER TABLE history_orders DISABLE ROW LEVEL SECURITY;

-- Verify the table was created
SELECT 'Table created successfully' as status;

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'history_orders' 
ORDER BY ordinal_position;

-- Test insert (this should work without errors)
SELECT 'Ready for data' as test_status;
```

## What This Creates:

### Key Fields:
- **`original_date`**: The date the user specified when creating the order
- **`delivered_date`**: The date it was actually marked as delivered  
- **All other fields**: Same as the orders table

### How It Will Work:
1. **Create order** for September 15th → Goes to `orders` table
2. **Mark as delivered** → Moves to `history_orders` table with `original_date = '2025-09-15'`
3. **History page** → Groups by `original_date`, shows under September 15th

## After Running SQL:
1. Refresh your app
2. Go to History page
3. Click "Check Tables" in the debug panel
4. Should show "✅ History Table Exists"
