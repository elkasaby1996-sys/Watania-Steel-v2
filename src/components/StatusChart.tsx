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
  steel: 'hsl(216, 20%, 54%)',
  amber: 'hsl(38, 82%, 58%)',
};

const chartTheme = {
  axis: 'var(--color-muted-foreground)',
  grid: 'var(--color-border)',
  dotStroke: 'var(--color-background)',
};

export function StatusChart() {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Order Trends</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.42} />
            <XAxis 
              dataKey="name" 
              stroke={chartTheme.axis}
              fontSize={12}
            />
            <YAxis 
              stroke={chartTheme.axis}
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
              stroke={chartPalette.steel}
              strokeWidth={3}
              dot={{ fill: chartPalette.steel, stroke: chartTheme.dotStroke, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: chartPalette.steel, stroke: chartPalette.amber, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
