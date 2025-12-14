import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, Database, Eye, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DriverDebugPanelProps {
  driverName: string;
}

export function DriverDebugPanel({ driverName }: DriverDebugPanelProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [cycleOrders, setCycleOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [cycleInfo, setCycleInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentCycleDates = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let cycleStart: Date;
    let cycleEnd: Date;
    
    if (currentDay >= 25) {
      // We're in the current month's cycle (25th of current month to 25th of next month)
      cycleStart = new Date(currentYear, currentMonth, 25);
      cycleEnd = new Date(currentYear, currentMonth + 1, 25, 23, 59, 59);
    } else {
      // We're in the previous month's cycle (25th of previous month to 25th of current month)
      cycleStart = new Date(currentYear, currentMonth - 1, 25);
      cycleEnd = new Date(currentYear, currentMonth, 25, 23, 59, 59);
    }
    
    return {
      start: cycleStart.toISOString().split('T')[0],
      end: cycleEnd.toISOString().split('T')[0],
      startDate: cycleStart,
      endDate: cycleEnd
    };
  };

  const fetchDriverOrders = async () => {
    setLoading(true);
    try {
      const cycle = getCurrentCycleDates();
      setCycleInfo(cycle);
      
      console.log('🗓️ Current cycle:', cycle);
      
      // Get all orders for this driver
      const { data: exactOrders, error: exactError } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_name', driverName)
        .order('date', { ascending: false });

      console.log(`📦 All orders for "${driverName}":`, exactOrders);
      setOrders(exactOrders || []);

      // Get orders in current cycle
      const { data: cycleOrdersData, error: cycleError } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_name', driverName)
        .gte('date', cycle.start)
        .lte('date', cycle.end)
        .order('date', { ascending: false });

      console.log(`📅 Cycle orders for "${driverName}" (${cycle.start} to ${cycle.end}):`, cycleOrdersData);
      setCycleOrders(cycleOrdersData || []);

      // Get all orders to see what driver names exist
      const { data: allOrdersData, error: allError } = await supabase
        .from('orders')
        .select('id, customer_name, driver_name, status, date, tons')
        .order('date', { ascending: false });

      console.log('All orders with driver names:', allOrdersData);
      setAllOrders(allOrdersData || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueDriverNames = [...new Set(allOrders.map(o => o.driver_name).filter(Boolean))];

  return (
    <Card className="border-yellow-200 bg-yellow-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Eye className="h-5 w-5" />
          Driver Orders Debug Panel
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Debug panel to check driver name matching for: <strong>{driverName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={fetchDriverOrders}
          disabled={loading}
          variant="outline"
          size="sm"
          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
        >
          <Search className="h-4 w-4 mr-1" />
          {loading ? 'Loading...' : 'Debug Driver Orders'}
        </Button>

        {cycleInfo && (
          <div className="bg-blue-100 border border-blue-200 rounded p-3">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">📅 Current Cycle Information</h4>
            <div className="text-blue-700 text-sm space-y-1">
              <p><strong>Cycle Period:</strong> {cycleInfo.start} to {cycleInfo.end}</p>
              <p><strong>Today:</strong> {new Date().toISOString().split('T')[0]}</p>
              <p><strong>Current Day:</strong> {new Date().getDate()}</p>
            </div>
          </div>
        )}

        {cycleOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">
              📅 Current Cycle Orders for "{driverName}" ({cycleOrders.length} found)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cycleOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                  <span>{order.id} - {order.customer_name}</span>
                  <div className="flex gap-2">
                    <Badge className={order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {order.status}
                    </Badge>
                    <span className="text-muted-foreground">{order.date}</span>
                    <span className="text-xs text-muted-foreground">{order.tons}t</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
              <strong>Cycle Metrics:</strong> 
              Total: {cycleOrders.length}, 
              Delivered: {cycleOrders.filter(o => o.status === 'delivered').length}, 
              Tons: {cycleOrders.reduce((sum, o) => sum + (Number(o.tons) || 0), 0)}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">
              📦 All Orders for "{driverName}" ({orders.length} found)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                  <span>{order.id} - {order.customer_name}</span>
                  <div className="flex gap-2">
                    <Badge className={order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {order.status}
                    </Badge>
                    <span className="text-muted-foreground">{order.date}</span>
                    <span className="text-xs text-muted-foreground">{order.tons}t</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">
              All Driver Names in Database ({uniqueDriverNames.length} unique)
            </h4>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {uniqueDriverNames.map(name => (
                <div key={name} className="p-2 bg-white rounded border text-sm">
                  <span className={name === driverName ? 'font-bold text-green-600' : ''}>
                    "{name}"
                  </span>
                  {name === driverName && <span className="text-green-600 ml-1">← MATCH</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {cycleOrders.length === 0 && orders.length > 0 && (
          <div className="bg-orange-100 border border-orange-200 rounded p-3">
            <h4 className="font-semibold text-orange-800 text-sm">⚠️ No Orders in Current Cycle</h4>
            <p className="text-orange-700 text-sm">
              Driver "{driverName}" has {orders.length} total orders, but none in the current cycle ({cycleInfo?.start} to {cycleInfo?.end}).
            </p>
            <p className="text-orange-700 text-xs mt-1">
              Check if the delivered orders are outside the current cycle period.
            </p>
          </div>
        )}

        {orders.length === 0 && allOrders.length > 0 && (
          <div className="bg-red-100 border border-red-200 rounded p-3">
            <h4 className="font-semibold text-red-800 text-sm">❌ No Orders Found</h4>
            <p className="text-red-700 text-sm">
              Driver name "{driverName}" doesn't match any orders. Check if:
            </p>
            <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
              <li>Driver name spelling is exact</li>
              <li>Orders were assigned to this driver</li>
              <li>Case sensitivity issues</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
