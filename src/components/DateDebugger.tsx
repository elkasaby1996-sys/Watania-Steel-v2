import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DateDebugger() {
  const [testDate, setTestDate] = useState('2025-09-20');
  const [results, setResults] = useState<string[]>([]);

  const testDateFlow = async () => {
    setResults([]);
    const logs: string[] = [];
    
    try {
      logs.push(`🔍 Testing date flow with: ${testDate}`);
      logs.push(`📅 Today's date is: ${new Date().toISOString().split('T')[0]}`);
      
      // Test 1: Check what gets stored in database
      const testOrder = {
        id: `TEST-${Date.now()}`,
        customer_name: 'Test Customer',
        date: testDate, // User-specified date
        status: 'in-progress',
        amount: 100,
        tons: 1,
        shift: 'morning',
        delivery_number: `TEST-${Date.now()}`,
        company: 'Test Company',
        site: 'Test Site',
        driver_name: '',
        phone_number: '',
        delivered_at: null,
        signed_delivery_note: false,
        order_type: 'straight-bar',
        breakdown_8mm: 0,
        breakdown_10mm: 0,
        breakdown_12mm: 0,
        breakdown_14mm: 0,
        breakdown_16mm: 0,
        breakdown_18mm: 0,
        breakdown_20mm: 0,
        breakdown_25mm: 0,
        breakdown_32mm: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      logs.push(`📦 Test order object date: ${testOrder.date}`);
      
      // Insert test order
      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert([testOrder])
        .select()
        .single();
      
      if (insertError) {
        logs.push(`❌ Insert error: ${insertError.message}`);
      } else {
        logs.push(`✅ Order inserted successfully`);
        logs.push(`📅 Date in database: ${insertedOrder.date}`);
        logs.push(`🔍 Full inserted order: ${JSON.stringify(insertedOrder, null, 2)}`);
        
        // Clean up test order
        await supabase.from('orders').delete().eq('id', testOrder.id);
        logs.push(`🧹 Test order cleaned up`);
      }
      
    } catch (error) {
      logs.push(`❌ Test failed: ${error}`);
    }
    
    setResults(logs);
  };

  const checkOrderQE = async () => {
    setResults([]);
    const logs: string[] = [];
    
    try {
      logs.push(`🔍 Checking order 'qe' in database...`);
      
      // Check in active orders
      const { data: activeOrder, error: activeError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', 'qe')
        .single();
      
      if (activeError) {
        logs.push(`❌ Order 'qe' not found in active orders: ${activeError.message}`);
      } else {
        logs.push(`📦 Order 'qe' found in active orders:`);
        logs.push(`  📅 Date: ${activeOrder.date}`);
        logs.push(`  👤 Customer: ${activeOrder.customer_name}`);
        logs.push(`  📊 Status: ${activeOrder.status}`);
        logs.push(`  🕐 Created: ${activeOrder.created_at}`);
      }
      
      // Check in history orders
      const { data: historyOrder, error: historyError } = await supabase
        .from('history_orders')
        .select('*')
        .eq('id', 'qe')
        .single();
      
      if (historyError) {
        logs.push(`❌ Order 'qe' not found in history: ${historyError.message}`);
      } else {
        logs.push(`📚 Order 'qe' found in history:`);
        logs.push(`  📅 Original Date: ${historyOrder.original_date}`);
        logs.push(`  📅 Delivered Date: ${historyOrder.delivered_date}`);
        logs.push(`  👤 Customer: ${historyOrder.customer_name}`);
      }
      
    } catch (error) {
      logs.push(`❌ Check failed: ${error}`);
    }
    
    setResults(logs);
  };

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Calendar className="h-5 w-5" />
          Date Debug Tool
        </CardTitle>
        <CardDescription className="text-blue-700">
          Debug date preservation issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-date">Test Date</Label>
            <Input
              id="test-date"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={testDateFlow}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              Test Date Flow
            </Button>
            <Button
              onClick={checkOrderQE}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <Search className="h-4 w-4 mr-1" />
              Check Order QE
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg p-4 border max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-2">Debug Results:</h4>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
