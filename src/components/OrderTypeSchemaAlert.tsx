import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Database, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

export function OrderTypeSchemaAlert() {
  const sqlCommands = `-- Add missing order_type column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'straight-bar' CHECK (order_type IN ('straight-bar', 'cut-and-bend'));

-- Update existing orders to have default order type
UPDATE orders 
SET order_type = 'straight-bar' 
WHERE order_type IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'order_type';

-- Check the data
SELECT id, customer_name, order_type, tons FROM orders LIMIT 5;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCommands);
    alert('SQL commands copied to clipboard!');
  };

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Order Type Column Missing
        </CardTitle>
        <CardDescription className="text-orange-700">
          The daily metrics need the order_type column to distinguish between straight bar and cut & bend orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-800 text-sm mb-2">🚨 Action Required:</h4>
          <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
            <li>Go to Supabase Dashboard → SQL Editor</li>
            <li>Copy and run the SQL commands below</li>
            <li>Refresh this page</li>
            <li>Daily metrics will then show correct breakdowns</li>
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
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            📋 Copy SQL Commands
          </Button>
          <Button 
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            variant="outline"
            size="sm"
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Supabase Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
