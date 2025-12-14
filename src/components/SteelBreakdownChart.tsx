import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { useDashboardStore } from '../stores/dashboardStore';

export function SteelBreakdownChart() {
  const { orders, historyOrders } = useDashboardStore();

  // Combine active orders and history orders for complete steel analysis
  const allOrders = [
    ...orders,
    ...historyOrders.map(historyOrder => ({
      id: historyOrder.id,
      status: historyOrder.status,
      breakdown: {
        '8mm': historyOrder.breakdown_8mm || 0,
        '10mm': historyOrder.breakdown_10mm || 0,
        '12mm': historyOrder.breakdown_12mm || 0,
        '14mm': historyOrder.breakdown_14mm || 0,
        '16mm': historyOrder.breakdown_16mm || 0,
        '18mm': historyOrder.breakdown_18mm || 0,
        '20mm': historyOrder.breakdown_20mm || 0,
        '25mm': historyOrder.breakdown_25mm || 0,
        '32mm': historyOrder.breakdown_32mm || 0,
      }
    }))
  ];

  // Calculate steel breakdown from all orders with breakdown data
  const steelBreakdown = allOrders
    .filter(order => order.breakdown && Object.values(order.breakdown).some(tons => tons > 0))
    .reduce((acc, order) => {
      if (order.breakdown) {
        Object.entries(order.breakdown).forEach(([size, tons]) => {
          if (!acc[size]) acc[size] = 0;
          acc[size] += tons || 0;
        });
      }
      return acc;
    }, {} as { [key: string]: number });

  const chartData = Object.entries(steelBreakdown)
    .map(([size, tons]) => ({
      size,
      tons: Math.round(tons * 100) / 100,
      name: size
    }))
    .filter(item => item.tons > 0)
    .sort((a, b) => parseInt(a.size) - parseInt(b.size));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Steel Breakdown Analysis</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
            <XAxis 
              dataKey="size" 
              stroke="hsl(240, 4%, 52%)"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(240, 4%, 52%)"
              fontSize={12}
              label={{ value: 'Tons', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(240, 4%, 80%)',
                borderRadius: '8px',
                color: 'hsl(0, 0%, 12%)'
              }}
              formatter={(value) => [`${value} tons`, 'Total Delivered']}
              labelFormatter={(label) => `Steel Size: ${label}`}
            />
            <Bar 
              dataKey="tons" 
              fill="hsl(232, 90%, 62%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        Total steel delivered across all completed orders, broken down by bar size
      </div>
    </Card>
  );
}
