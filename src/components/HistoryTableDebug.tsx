import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Database, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function HistoryTableDebug() {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const checkHistoryTable = async () => {
    setLoading(true);
    try {
      // Try to query history_orders table directly
      const { data: historyData, error: historyError } = await supabase
        .from('history_orders')
        .select('id, customer_name, original_date, delivered_date, status, tons')
        .order('delivered_at', { ascending: false });

      if (historyError) {
        if (historyError.code === 'PGRST116' || historyError.message?.includes('does not exist')) {
          console.log('❌ History table does not exist');
          setTableExists(false);
        } else {
          console.log('❌ Error accessing history table:', historyError);
          setTableExists(false);
        }
        setHistoryOrders([]);
      } else {
        console.log('✅ History table exists and accessible');
        setTableExists(true);
        setHistoryOrders(historyData || []);
        console.log('📚 History orders:', historyData);
      }

      // Get active orders
      const { data: activeData, error: activeError } = await supabase
        .from('orders')
        .select('id, customer_name, date, status, tons')
        .order('created_at', { ascending: false });

      if (!activeError) {
        setActiveOrders(activeData || []);
        console.log('📦 Active orders:', activeData);
      } else {
        console.log('❌ Error fetching active orders:', activeError);
        setActiveOrders([]);
      }

    } catch (error) {
      console.error('❌ Error checking tables:', error);
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Database className="h-5 w-5" />
          History Table Debug Panel
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Check if history table exists and debug order flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={checkHistoryTable}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <Eye className="h-4 w-4 mr-1" />
            {loading ? 'Checking...' : 'Check Tables'}
          </Button>
          <Button
            onClick={async () => {
              setLoading(true);
              try {
                const { orderService } = await import('../lib/supabase');
                await orderService.forceCleanupDeliveredOrders();
                // Refresh the check after cleanup
                setTimeout(() => checkHistoryTable(), 1000);
              } catch (error) {
                console.error('Cleanup failed:', error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {loading ? 'Cleaning...' : 'Force Cleanup'}
          </Button>
          <Button
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <Database className="h-4 w-4 mr-1" />
            Open Supabase
          </Button>
        </div>

        {tableExists === false && (
          <div className="bg-red-100 border border-red-200 rounded p-3">
            <h4 className="font-semibold text-red-800 text-sm">❌ History Table Missing</h4>
            <p className="text-red-700 text-sm">
              The history_orders table doesn't exist. Run the SQL setup first.
            </p>
          </div>
        )}

        {tableExists === true && (
          <div className="bg-green-100 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-800 text-sm">✅ History Table Exists</h4>
            <p className="text-green-700 text-sm">
              History table is properly set up.
            </p>
          </div>
        )}

        {activeOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">
              📦 Active Orders ({activeOrders.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                  <span>{order.id} - {order.customer_name}</span>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground font-mono">📅 {order.date}</span>
                    <span className="text-muted-foreground">{order.status}</span>
                    <span className="text-xs text-gray-500">{order.tons}t</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {historyOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">
              📚 History Orders ({historyOrders.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {historyOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                  <span>{order.id} - {order.customer_name}</span>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Orig: {order.original_date}</span>
                    <span className="text-muted-foreground">Del: {order.delivered_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeOrders.length === 0 && historyOrders.length === 0 && tableExists && (
          <div className="bg-blue-100 border border-blue-200 rounded p-3">
            <h4 className="font-semibold text-blue-800 text-sm">ℹ️ No Orders Found</h4>
            <p className="text-blue-700 text-sm">
              No orders in either active or history tables. Create some orders to test.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
