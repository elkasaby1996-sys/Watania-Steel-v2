import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Database, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

export function DatabaseSchemaAlert() {
  const sqlCommands = `-- URGENT FIX: Add missing is_active column
-- Check current table structure first
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'drivers' ORDER BY ordinal_position;

-- Add the missing is_active column
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing drivers to be active
UPDATE drivers SET is_active = TRUE WHERE is_active IS NULL;

-- If drivers table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);

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

-- Verify the fix worked
SELECT id, name, phone_number, is_active FROM drivers;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCommands);
    alert('SQL commands copied to clipboard!');
  };

  return (
    <Card className="border-red-200 bg-red-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          URGENT: Missing is_active Column
        </CardTitle>
        <CardDescription className="text-red-700">
          The drivers table is missing the is_active column. This is causing the status toggle to fail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 text-sm mb-2">🚨 URGENT FIX REQUIRED:</h4>
          <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
            <li>Go to Supabase Dashboard → SQL Editor</li>
            <li>Copy and run the SQL commands below (they will add the missing column)</li>
            <li>Refresh this page</li>
            <li>Driver status toggles will then work properly</li>
          </ol>
        </div>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
          <pre>{sqlCommands}</pre>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            📋 Copy SQL Commands
          </Button>
          <Button 
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Supabase Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
