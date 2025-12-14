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

export function OrderChart() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Order Trends</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(240, 4%, 52%)"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(240, 4%, 52%)"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(240, 4%, 80%)',
                borderRadius: '8px',
                color: 'hsl(0, 0%, 12%)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="hsl(340, 80%, 30%)" 
              strokeWidth={3}
              dot={{ fill: 'hsl(340, 80%, 30%)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(340, 80%, 30%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
