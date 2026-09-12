import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/dashboardStore';

const DIAMETERS = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;

type DiameterKey = (typeof DIAMETERS)[number];

type DiameterRow = {
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

  const rows: DiameterRow[] = DIAMETERS.map((diameter) => ({
    name: diameter,
    value: steelMix[diameter as DiameterKey] || 0
  })).filter((item) => item.value > 0);

  const total = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="material-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Material breakdown</p><h2 className="text-lg font-headline font-semibold text-foreground">Steel by diameter</h2></div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {isLoadingMetrics || metricsError ? '—' : formatTons(total)} total tons
        </p>
      </div>

      {isLoadingMetrics ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-56 rounded-xl bg-muted" />
        </div>
      ) : metricsError ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-400">{metricsError}</p>
          <Button variant="secondary" className="w-fit" onClick={() => loadDashboardMetrics()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No working orders to display.</p>
      ) : (
        <div className="diameter-bars" role="list" aria-label="Steel tonnage and share by diameter">
          {rows.map((entry) => <div className="diameter-row" role="listitem" key={entry.name}>
            <span className="diameter-name">{entry.name}</span>
            <meter min={0} max={total} value={entry.value} aria-label={`${entry.name} share of steel`} />
            <strong>{formatTons(entry.value)} <small>t</small></strong>
            <span className="diameter-share">{((entry.value / total) * 100).toFixed(1)}%</span>
          </div>)}
          <p className="material-caption">Distribution across active production orders</p>
        </div>
      )}
    </Card>
  );
}
