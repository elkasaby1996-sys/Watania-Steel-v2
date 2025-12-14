# Database Setup for Drivers Management

## Run This SQL in Supabase SQL Editor

```sql
-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add driver_id column to orders table (optional, for future use)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS driver_id TEXT REFERENCES drivers(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_driver_name ON orders(driver_name);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- Enable RLS (or disable if you prefer)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drivers
CREATE POLICY IF NOT EXISTS "Authenticated users can view drivers" ON drivers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Editors can manage drivers" ON drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

-- Insert some sample drivers (optional)
INSERT INTO drivers (id, name, phone_number, is_active) VALUES
('DRV-001', 'Ahmed Hassan', '+20 100 123 4567', true),
('DRV-002', 'Mohamed Ali', '+20 101 234 5678', true),
('DRV-003', 'Omar Khaled', '+20 102 345 6789', true),
('DRV-004', 'Mahmoud Saeed', '+20 103 456 7890', false)
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT * FROM drivers ORDER BY name;
```

## Features Added

### 1. Drivers Table
- **id**: Unique identifier (DRV-xxx format)
- **name**: Driver's full name
- **phone_number**: Contact number
- **is_active**: Whether driver is currently active
- **created_at/updated_at**: Timestamps

### 2. Driver Management
- Add new drivers with name, phone, and status
- Edit existing driver information
- Activate/deactivate drivers
- Delete drivers (admin only)

### 3. Monthly Cycle Metrics
- Metrics calculated from 25th to 25th of each month
- Total orders per driver in current cycle
- Completed vs pending orders
- Total tons delivered
- Performance rankings

### 4. Integration with Orders
- Driver dropdown in order creation form
- Auto-fill phone number when driver selected
- Metrics based on  driver_name field in orders table
- Real-time performance tracking

### 5. Search and Filtering
- Search drivers by name or phone number
- Filter by active/inactive status
- Real-time search results

### 6. Role-Based Permissions
- **Viewers**: Can view drivers and metrics
- **Editors**: Can create, edit drivers
- **Admins**: Full access including delete

## After Running SQL:

1. Refresh your app
2. Go to Drivers tab in sidebar
3. Add new drivers or use sample data
4. Create orders and assign drivers
5. View metrics updated in real-time

## Sample Data Explanation:

The sample drivers include:
- **Ahmed Hassan**: Active driver
- **Mohamed Ali**: Active driver  
- **Omar Khaled**: Active driver
- **Mahmoud Saeed**: Inactive driver (for testing)

## Cycle Calculation Logic:

- **Current cycle**: If today is >= 25th, cycle is 25th of current month to 24th of next month
- **Previous cycle**: If today is < 25th, cycle is 25th of previous month to 24th of current month
- **Example**: On March 30th, cycle is March 25th - April 24th
- **Example**: On March 15th, cycle is February 25th - March 24th

This ensures consistent monthly reporting periods regardless of when you check the metrics.
