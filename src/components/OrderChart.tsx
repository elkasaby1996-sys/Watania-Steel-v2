import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

const chartData = [
  { name: 'Jan', orders: 65 },
  { name: 'Feb', orders: 78 },
  { name: 'Mar', orders: 90 },
  { name: 'Apr', orders: 81 },
  { name: 'May', orders: 95 },
  { name: 'Jun', orders: 110 }
];

const chartPalette = {
  maroon: 'hsl(345, 66%, 44%)',
  steel: 'hsl(216, 20%, 54%)',
  amber: 'hsl(38, 82%, 58%)',
  green: 'hsl(142, 48%, 46%)',
  muted: 'hsl(214, 18%, 64%)',
};

export function OrderChart() {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Order Trends</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 20%, 34%)" opacity={0.42} />
            <XAxis 
              dataKey="name" 
              stroke={chartPalette.muted}
              fontSize={12}
            />
            <YAxis 
              stroke={chartPalette.muted}
              fontSize={12}
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
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke={chartPalette.maroon}
              strokeWidth={3}
              dot={{ fill: chartPalette.maroon, stroke: 'hsl(220, 42%, 7%)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: chartPalette.maroon, stroke: chartPalette.amber, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
