import { Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDashboardStore } from '../stores/dashboardStore';

export function DashboardCards() {
  const { stats } = useDashboardStore();

  const cards = [
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary/10'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Delayed',
      value: stats.delayed,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{card.title}</p>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
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
