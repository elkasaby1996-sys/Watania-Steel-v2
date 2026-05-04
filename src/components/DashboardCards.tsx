import { Package, Scissors, Ruler, Weight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '../stores/dashboardStore';

export function DashboardCards() {
  const { dashboardMetrics, isLoadingMetrics, metricsError, loadDashboardMetrics } = useDashboardStore();

  const formatTons = (value: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);

  const cards = [
    {
      title: 'Active Orders',
      value: dashboardMetrics.todayOrders,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/20'
    },
    {
      title: 'Total Cut & Bend (t)',
      value: formatTons(dashboardMetrics.cutAndBendTons),
      icon: Scissors,
      color: 'text-tertiary-foreground',
      bgColor: 'bg-tertiary/30'
    },
    {
      title: 'Total Straight Bar (t)',
      value: formatTons(dashboardMetrics.straightBarTons),
      icon: Ruler,
      color: 'text-success',
      bgColor: 'bg-success/20'
    },
    {
      title: 'Total Tons (t)',
      value: formatTons(dashboardMetrics.totalTons),
      icon: Weight,
      color: 'text-warning',
      bgColor: 'bg-warning/20'
    }
  ];

  if (isLoadingMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dashboard metrics unavailable</p>
              <p className="text-sm text-red-400">{metricsError}</p>
            </div>
            <Button onClick={() => loadDashboardMetrics()} variant="secondary">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{card.title}</p>
              <p className="text-3xl font-bold text-gray-50">{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
