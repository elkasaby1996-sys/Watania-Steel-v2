# CRITICAL: Update Database Schema

## Run This SQL in Supabase SQL Editor NOW

The new fields won't show because the database columns don't exist yet. Run these commands:

```sql
-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS signed_delivery_note BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'straight-bar' CHECK (order_type IN ('straight-bar', 'cut-and-bend')),
ADD COLUMN IF NOT EXISTS breakdown_8mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_10mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_12mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_14mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_16mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_18mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_20mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_25mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_32mm DECIMAL(8,2) DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN (
  'signed_delivery_note', 'order_type',
  'breakdown_8mm', 'breakdown_10mm', 'breakdown_12mm',
  'breakdown_14mm', 'breakdown_16mm', 'breakdown_18mm',
  'breakdown_20mm', 'breakdown_25mm', 'breakdown_32mm'
)
ORDER BY column_name;

-- Update existing orders with default values
UPDATE orders 
SET 
  signed_delivery_note = FALSE,
  order_type = 'straight-bar',
  breakdown_8mm = 0,
  breakdown_10mm = 0,
  breakdown_12mm = 0,
  breakdown_14mm = 0,
  breakdown_16mm = 0,
  breakdown_18mm = 0,
  breakdown_20mm = 0,
  breakdown_25mm = 0,
  breakdown_32mm = 0
WHERE signed_delivery_note IS NULL;
```

## After Running SQL:
1. Refresh your app
2. Create a new order - all fields will be saved
3. View existing orders - will show new fields with default values
4. Edit any order including delivered ones
