# Fix Orders Table RLS Policy Issue

## Problem
The orders table has RLS enabled but no policies allow users to insert orders, causing "new row violates row-level security policy" error.

## URGENT FIX - Run in Supabase SQL Editor

### Option 1: Disable RLS for Orders Table (Quick Fix)
```sql
-- Disable RLS for orders table (simplest solution)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
```

### Option 2: Create Proper RLS Policies (Recommended)
```sql
-- First, make sure orders table exists with proper structure
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed', 'delivered')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tons DECIMAL(8,2) NOT NULL DEFAULT 0,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  delivery_number TEXT,
  company TEXT,
  site TEXT,
  driver_name TEXT,
  phone_number TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- Create policies that allow authenticated users to manage orders
CREATE POLICY "Authenticated users can view all orders" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete orders" ON orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Option 3: Role-Based Policies (Most Secure)
```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- Viewers can only read
CREATE POLICY "Viewers can read orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('viewer', 'editor', 'admin')
    )
  );

-- Editors and admins can create and update
CREATE POLICY "Editors can create orders" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Editors can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete orders" ON orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Recommended Quick Fix

For immediate resolution, run this in Supabase SQL Editor:

```sql
-- Quick fix: Disable RLS for orders table
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Verify orders table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
```

## Test After Fix

After running the SQL, try creating an order again. It should work immediately.

## Re-enable Security Later (Optional)

Once everything is working, you can re-enable RLS with proper policies:

```sql
-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can do everything
CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.uid() IS NOT NULL);
```
