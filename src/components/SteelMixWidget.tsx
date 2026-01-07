import { Card } from '@/components/ui/card';
import { useDashboardStore } from '@/stores/dashboardStore';

const DIAMETERS = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;

type DiameterKey = (typeof DIAMETERS)[number];

export function SteelMixWidget() {
  const { dashboardMetrics, metricsLoading } = useDashboardStore();
  const { steelMix } = dashboardMetrics;

  const formatTons = (value: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);

  const items = DIAMETERS.map(diameter => ({
    diameter,
    value: steelMix[diameter as DiameterKey] || 0
  })).filter(item => item.value > 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-headline font-semibold text-gray-50 mb-4">
        Steel Mix (Working Orders)
      </h3>
      {metricsLoading ? (
        <p className="text-sm text-muted-foreground">Loading steel mix...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No working order steel mix yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.diameter} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.diameter}</span>
              <span className="text-sm font-semibold text-gray-50">{formatTons(item.value)} t</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
