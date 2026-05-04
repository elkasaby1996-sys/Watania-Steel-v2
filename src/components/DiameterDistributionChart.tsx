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
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-lg font-headline font-semibold text-gray-50">
          Diameter Distribution
        </h3>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {formatTons(total)} total tons
        </p>
      </div>

      {isLoadingMetrics ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-32 rounded bg-white/[0.06]" />
          <div className="h-56 rounded-xl bg-white/[0.06]" />
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
        <div className="overflow-hidden rounded-xl border border-white/[0.10]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Diameter</th>
                <th className="px-4 py-3 text-right font-semibold">Tons</th>
                <th className="px-4 py-3 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {rows.map((entry) => (
                <tr key={entry.name} className="bg-card/30">
                  <td className="px-4 py-3 font-semibold text-foreground">{entry.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{formatTons(entry.value)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {total > 0 ? `${((entry.value / total) * 100).toFixed(1)}%` : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
