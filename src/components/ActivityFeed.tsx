import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, RefreshCw, CheckCircle } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';

export function ActivityFeed() {
  const { activities } = useDashboardStore();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <Package className="h-4 w-4 text-primary" />;
      case 'order_updated':
        return <RefreshCw className="h-4 w-4 text-tertiary-foreground" />;
      case 'order_completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Package className="h-4 w-4 text-primary" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-headline font-semibold text-gray-50">Activity Feed</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id}>
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg border border-white/[0.1] bg-white/[0.04] p-1.5 shadow-[inset_0_1px_rgba(255,255,255,0.08)]">
                {getActivityIcon(activity.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-card-foreground">{activity.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            </div>
            {index < activities.length - 1 && (
              <Separator className="my-4 bg-white/[0.08]" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
