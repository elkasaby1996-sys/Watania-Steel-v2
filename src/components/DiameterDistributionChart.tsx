import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const DIAMETERS = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;

type DiameterKey = (typeof DIAMETERS)[number];

const chartPalette = {
  maroon: 'hsl(345, 66%, 44%)',
  steel: 'hsl(216, 20%, 54%)',
  amber: 'hsl(38, 82%, 58%)',
  green: 'hsl(142, 48%, 46%)',
  muted: 'hsl(214, 18%, 64%)',
};

const CHART_COLORS: Record<DiameterKey, string> = {
  '8mm': chartPalette.muted,
  '10mm': 'hsl(216, 20%, 48%)',
  '12mm': chartPalette.steel,
  '14mm': 'hsl(216, 18%, 60%)',
  '16mm': chartPalette.maroon,
  '18mm': 'hsl(345, 45%, 38%)',
  '20mm': chartPalette.amber,
  '25mm': 'hsl(38, 46%, 48%)',
  '32mm': chartPalette.green
};

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
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-headline font-semibold text-gray-50">
        Diameter Distribution
      </h3>
      {isLoadingMetrics ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-32 rounded bg-white/[0.06]" />
          <div className="h-72 rounded-xl bg-white/[0.06]" />
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
                  stroke="hsl(220, 42%, 7%)"
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={CHART_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--glass-panel-strong)',
                    border: '1px solid var(--glass-border-strong)',
                    borderRadius: '12px',
                    color: 'var(--color-foreground)',
                    fontSize: '14px',
                    padding: '10px 12px',
                    boxShadow: 'var(--glass-shadow-soft)',
                    backdropFilter: 'blur(18px)'
                  }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
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
              <div key={entry.name} className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1">
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
