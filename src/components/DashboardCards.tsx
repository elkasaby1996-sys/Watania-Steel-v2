import { Package, Scissors, Ruler, Weight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDashboardStore } from '../stores/dashboardStore';

export function DashboardCards() {
  const { dashboardMetrics, metricsLoading } = useDashboardStore();

  const formatTons = (value: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);

  const cards = [
    {
      title: "Today's Orders",
      value: metricsLoading ? '—' : dashboardMetrics.todayOrders,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/20'
    },
    {
      title: 'Total Cut & Bend (t)',
      value: metricsLoading ? '—' : formatTons(dashboardMetrics.cutAndBendTons),
      icon: Scissors,
      color: 'text-tertiary-foreground',
      bgColor: 'bg-tertiary/30'
    },
    {
      title: 'Total Straight Bar (t)',
      value: metricsLoading ? '—' : formatTons(dashboardMetrics.straightBarTons),
      icon: Ruler,
      color: 'text-success',
      bgColor: 'bg-success/20'
    },
    {
      title: 'Total Tons (t)',
      value: metricsLoading ? '—' : formatTons(dashboardMetrics.totalTons),
      icon: Weight,
      color: 'text-warning',
      bgColor: 'bg-warning/20'
    }
  ];

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
