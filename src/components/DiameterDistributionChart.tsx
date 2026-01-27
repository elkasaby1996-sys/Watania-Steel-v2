import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const DIAMETERS = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;

const CHART_COLORS: Record<DiameterKey, string> = {
  '8mm': '#4B5563',
  '10mm': '#0EA5E9',
  '12mm': '#22C55E',
  '14mm': '#14B8A6',
  '16mm': '#F59E0B',
  '18mm': '#A78BFA',
  '20mm': '#F97316',
  '25mm': '#E879F9',
  '32mm': '#60A5FA'
};

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
  const { dashboardMetrics, isLoadingMetrics, metricsError, loadDashboardMetrics } = useDashboardStore();
  const { steelMix } = dashboardMetrics;

  const data: ChartDatum[] = DIAMETERS.map((diameter) => ({
    name: diameter,
    value: steelMix[diameter as DiameterKey] || 0
  })).filter((item) => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderTooltip = (value: number, label: string) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return `${label} — ${formatTons(value)} t (${percent.toFixed(1)}%)`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-headline font-semibold text-gray-50 mb-4">
        Diameter Distribution
      </h3>
      {isLoadingMetrics ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-72 rounded bg-muted" />
        </div>
      ) : metricsError ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-400">{metricsError}</p>
          <Button variant="secondary" className="w-fit" onClick={() => loadDashboardMetrics()}>
            Retry
          </Button>
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No working orders to display.</p>
      ) : (
        <div className="space-y-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="88%"
                  paddingAngle={1}
                  stroke="#0f172a"
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={CHART_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    padding: '10px 12px'
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number, _name, props) => {
                    const label = (props?.payload as ChartDatum | undefined)?.name ?? 'Diameter';
                    return [renderTooltip(value, label), ''];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[entry.name] }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
