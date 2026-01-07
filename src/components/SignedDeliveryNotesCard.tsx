import { Card } from '@/components/ui/card';
import { useDashboardStore } from '@/stores/dashboardStore';

export function SignedDeliveryNotesCard() {
  const { dashboardMetrics, metricsLoading } = useDashboardStore();

  const signedLabel = metricsLoading
    ? '—'
    : `${dashboardMetrics.signedOrders} / ${dashboardMetrics.totalOrders}`;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-headline font-semibold text-gray-50 mb-4">
        Signed Delivery Notes
      </h3>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Signed / Total (Today)</p>
        <p className="text-3xl font-bold text-gray-50">{signedLabel}</p>
        {metricsLoading && (
          <p className="text-xs text-muted-foreground mt-2">Loading signed counts...</p>
        )}
      </div>
    </Card>
  );
}
