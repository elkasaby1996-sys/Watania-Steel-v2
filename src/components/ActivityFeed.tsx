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
        return <RefreshCw className="h-4 w-4 text-tertiary" />;
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
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Activity Feed</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            </div>
            {index < activities.length - 1 && (
              <Separator className="my-4 bg-border" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
