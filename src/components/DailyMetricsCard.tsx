import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Weight, BarChart3, Wrench } from 'lucide-react';

interface DailyMetricsCardProps {
  date: string;
  metrics: {
    straightBar: number;
    cutAndBend: number;
    total: number;
  };
  orderCount: number;
}

export function DailyMetricsCard({ date, metrics, orderCount }: DailyMetricsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-blue-800">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {formatDate(date)}
          </span>
          <Badge variant="outline" className="text-blue-700 border-blue-300">
            {orderCount} orders
          </Badge>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
