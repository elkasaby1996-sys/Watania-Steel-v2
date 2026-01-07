import { Card } from '@/components/ui/card';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const DIAMETERS = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;

const CHART_COLORS = [
  '#38bdf8',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f97316',
  '#f472b6',
  '#a78bfa',
  '#60a5fa',
  '#94a3b8'
];

type DiameterKey = (typeof DIAMETERS)[number];

type ChartDatum = {
  name: DiameterKey;
  value: number;
};

const formatTons = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value);

export function DiameterDistributionChart() {
  const { dashboardMetrics, metricsLoading } = useDashboardStore();
  const { steelMix } = dashboardMetrics;

  const data: ChartDatum[] = DIAMETERS.map((diameter) => ({
    name: diameter,
    value: steelMix[diameter as DiameterKey] || 0
  })).filter((item) => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-headline font-semibold text-gray-50 mb-4">
        Diameter Distribution
      </h3>
      {metricsLoading ? (
        <p className="text-sm text-muted-foreground">Loading distribution...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No working orders to display.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f8fafc' }}
                formatter={(value: number, _name, props) => {
                  const percent = total > 0 ? (value / total) * 100 : 0;
                  const label = (props?.payload as ChartDatum | undefined)?.name ?? 'Diameter';
                  return [`${formatTons(value)} t (${percent.toFixed(1)}%)`, label];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
