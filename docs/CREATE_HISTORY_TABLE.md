# Create Separate History Table - Database Setup

## Run This SQL in Supabase SQL Editor

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

-- Drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can view history orders" ON history_orders;
DROP POLICY IF EXISTS "System can insert history orders" ON history_orders;

-- Create RLS policies
CREATE POLICY "Authenticated users can view history orders" ON history_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert history orders" ON history_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the table was created
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'history_orders' 
ORDER BY ordinal_position;
```

## How It Will Work

### 1. Active Orders (orders table)
- Contains only active orders (in-progress status)
- When marked as delivered, order is MOVED to history_orders table
- Keeps the orders table clean and fast

### 2. History Orders (history_orders table)
- Contains all delivered orders
- Preserves original_date (user-specified date)
- Records delivered_date (when actually delivered)
- Groups by original_date for proper historical tracking

### 3. Benefits
- ✅ **Clean separation** between active and completed orders
- ✅ **Preserves original dates** without confusion
- ✅ **Better performance** (smaller active orders table)
- ✅ **Clear data model** - no date conflicts
- ✅ **Proper historical tracking** by user-specified dates
