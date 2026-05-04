import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { useDashboardStore } from '../stores/dashboardStore';
import { roundTo3Decimals, formatNumber } from '../lib/utils';

const chartPalette = {
  steel: 'hsl(216, 20%, 54%)',
};

const chartTheme = {
  axis: 'var(--color-muted-foreground)',
  grid: 'var(--color-border)',
};

export function SteelBreakdownChart() {
  const { orders, historyOrders } = useDashboardStore();
  const historyIds = new Set(historyOrders.map((order) => String(order.id)));

  // Count delivered orders only, with history taking precedence over active fallback rows.
  const allOrders = [
    ...historyOrders
      .filter(historyOrder => historyOrder.status === 'delivered')
      .map(historyOrder => ({
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
      })),
    ...orders.filter(order => order.status === 'delivered' && !historyIds.has(String(order.id)))
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
      tons: roundTo3Decimals(tons),
      name: size
    }))
    .filter(item => item.tons > 0)
    .sort((a, b) => parseInt(a.size) - parseInt(b.size));

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Steel Breakdown Analysis</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.42} />
            <XAxis 
              dataKey="size" 
              stroke={chartTheme.axis}
              fontSize={12}
            />
            <YAxis 
              stroke={chartTheme.axis}
              fontSize={12}
              label={{ value: 'Tons', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--glass-panel-strong)',
                border: '1px solid var(--glass-border-strong)',
                borderRadius: '12px',
                color: 'var(--color-foreground)',
                boxShadow: 'var(--glass-shadow-soft)',
                backdropFilter: 'blur(18px)'
              }}
              itemStyle={{ color: 'var(--color-foreground)' }}
              labelStyle={{ color: 'var(--color-muted-foreground)' }}
              formatter={(value: number) => [`${formatNumber(value)} tons`, 'Total Delivered']}
              labelFormatter={(label) => `Steel Size: ${label}`}
            />
            <Bar 
              dataKey="tons" 
              fill={chartPalette.steel}
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
