import { ClipboardList, Scissors, Ruler, Scale } from 'lucide-react';
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
      icon: ClipboardList,
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
      icon: Scale,
      color: 'text-warning',
      bgColor: 'bg-warning/20'
    }
  ];

  if (isLoadingMetrics) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5 animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-white/[0.06]" />
                <div className="h-8 w-20 rounded bg-white/[0.06]" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/[0.06]" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <Card className="p-5">
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{card.title}</p>
              <p className="text-3xl font-bold tabular-nums text-gray-50">{card.value}</p>
            </div>
            <div className={`rounded-xl border border-white/10 p-3 shadow-[inset_0_1px_rgba(255,255,255,0.08)] ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
