# URGENT: Fix Drivers Table Schema

## Problem
The `is_active` column doesn't exist in the drivers table, causing the error "couldn't find the is_active columns of drivers in the schema cache".

## IMMEDIATE FIX - Run in Supabase SQL Editor

```sql
-- Check current drivers table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
ORDER BY ordinal_position;

-- Add the missing is_active column
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing drivers to be active by default
UPDATE drivers 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
ORDER BY ordinal_position;

-- Check the data
SELECT id, name, phone_number, is_active FROM drivers;
```

## Alternative: Recreate the entire drivers table

If the above doesn't work, recreate the table:

```sql
-- Drop existing table (WARNING: This will delete all driver data)
DROP TABLE IF EXISTS drivers CASCADE;

-- Create new drivers table with all required columns
CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Authenticated users can view drivers" ON drivers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Editors can manage drivers" ON drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

-- Insert sample data
INSERT INTO drivers (id, name, phone_number, is_active) VALUES
('DRV-001', 'Ahmed Hassan', '+20 100 123 4567', true),
('DRV-002', 'Mohamed Ali', '+20 101 234 5678', true),
('DRV-003', 'Omar Khaled', '+20 102 345 6789', true),
('DRV-004', 'Mahmoud Saeed', '+20 103 456 7890', false)
ON CONFLICT (id) DO NOTHING;
```

## After Running the SQL:
1. Refresh your app
2. The debug panel should show the is_active column
3. Status toggles should work properly
4. Remove the debug panel once confirmed working
