import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Database } from 'lucide-react';

export function OrderCreationError() {
  return (
    <Card className="border-red-200 bg-red-50 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Order Creation Blocked
        </CardTitle>
        <CardDescription className="text-red-700">
          The orders table has RLS policies that prevent order creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-semibold text-yellow-800 text-sm mb-2">🚨 Quick Fix Required</h4>
          <p className="text-xs text-yellow-700 mb-2">
            Run this command in Supabase Dashboard → SQL Editor:
          </p>
          <code className="block bg-yellow-100 p-2 rounded text-xs font-mono text-yellow-800">
            ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
          </code>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 text-sm mb-1">📖 Complete Fix Guide</h4>
          <p className="text-xs text-blue-700">
            Check <code>docs/FIX_ORDERS_RLS.md</code> for detailed instructions and security options.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
