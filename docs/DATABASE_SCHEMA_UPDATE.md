# Database Schema Update for Enhanced Order Form

## Required Database Changes

Run these SQL commands in Supabase SQL Editor to add the new fields:

```sql
-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS signed_delivery_note BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('straight-bar', 'cut-and-bend')) DEFAULT 'straight-bar',
ADD COLUMN IF NOT EXISTS breakdown_8mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_10mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_12mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_14mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_16mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_18mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_20mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_25mm DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakdown_32mm DECIMAL(8,2) DEFAULT 0;

-- Verify the new columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN (
  'signed_delivery_note', 'order_type', 
  'breakdown_8mm', 'breakdown_10mm', 'breakdown_12mm', 
  'breakdown_14mm', 'breakdown_16mm', 'breakdown_18mm', 
  'breakdown_20mm', 'breakdown_25mm', 'breakdown_32mm'
)
ORDER BY column_name;
```

## New Fields Added

### 1. Signed Delivery Note
- **Field**: `signed_delivery_note`
- **Type**: Boolean (true/false)
- **Default**: false
- **Purpose**: Track if delivery note has been signed

### 2. Order Type
- **Field**: `order_type`
- **Type**: Text with constraint
- **Options**: 'straight-bar' or 'cut-and-bend'
- **Default**: 'straight-bar'
- **Purpose**: Specify the type of steel order

### 3. Steel Breakdown
- **Fields**: `breakdown_8mm` through `breakdown_32mm`
- **Type**: Decimal(8,2) - allows up to 999,999.99 tons
- **Default**: 0
- **Purpose**: Track tonnage for each steel bar size

## Form Features

### Auto-calculation
- Total tons automatically calculated from breakdown
- Validation ensures breakdown matches total tons
- Real-time updates as user enters values

### Enhanced Validation
- Breakdown total must match entered total tons (within 0.1 tolerance)
- All steel sizes are optional but total must be valid
- Form prevents submission if totals don't match

### User Experience
- 3-column grid layout for steel sizes
- Real-time total calculation display
- Clear labeling and validation messages
- Larger dialog to accommodate new fields
