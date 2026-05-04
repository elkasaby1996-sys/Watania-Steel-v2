import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart3, Weight, Wrench, Package, TrendingUp } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { roundTo3Decimals, formatNumber } from '../lib/utils';
import { normalizeOrderType } from '../lib/orderTypes';

export function HistoryOverview() {
  const dashboardStore = useDashboardStore();
  
  // Safe access to store functions
  const getDailyMetrics = dashboardStore?.getDailyMetrics;
  const getFilteredDeliveredOrders = dashboardStore?.getFilteredDeliveredOrders || (() => []);
  
  const allDeliveredOrders = getFilteredDeliveredOrders();
  
  // Calculate daily metrics manually if function doesn't exist
  const dailyMetrics = getDailyMetrics ? getDailyMetrics() : calculateDailyMetricsOverview();

  function calculateDailyMetricsOverview() {
    const metrics: { [date: string]: { straightBar: number; cutAndBend: number; total: number } } = {};
    
    allDeliveredOrders.forEach(order => {
      const deliveredDate = order.deliveredAt 
        ? new Date(order.deliveredAt).toISOString().split('T')[0]
        : order.date;
      
      if (!metrics[deliveredDate]) {
        metrics[deliveredDate] = { straightBar: 0, cutAndBend: 0, total: 0 };
      }
      
      const tons = order.tons || 0;
      if (normalizeOrderType(order.orderType) === 'cut-and-bend') {
        metrics[deliveredDate].cutAndBend += tons;
      } else {
        metrics[deliveredDate].straightBar += tons;
      }
      metrics[deliveredDate].total += tons;
    });
    
    // Round all values
    Object.keys(metrics).forEach(date => {
      metrics[date].straightBar = roundTo3Decimals(metrics[date].straightBar);
      metrics[date].cutAndBend = roundTo3Decimals(metrics[date].cutAndBend);
      metrics[date].total = roundTo3Decimals(metrics[date].total);
    });
    
    return metrics;
  }
  
  // Calculate overall totals
  const totalStraightBar = Object.values(dailyMetrics).reduce((sum, day) => sum + day.straightBar, 0);
  const totalCutAndBend = Object.values(dailyMetrics).reduce((sum, day) => sum + day.cutAndBend, 0);
  const grandTotal = totalStraightBar + totalCutAndBend;
  const totalDays = Object.keys(dailyMetrics).length;
  const averagePerDay = totalDays > 0 ? roundTo3Decimals(grandTotal / totalDays) : 0;

  const overviewCards = [
    {
      title: "Total Delivered",
      value: `${formatNumber(grandTotal)}`,
      subtitle: "tons",
      icon: Weight,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: "Straight Bar",
      value: `${formatNumber(totalStraightBar)}`,
      subtitle: `${grandTotal > 0 ? roundTo3Decimals((totalStraightBar / grandTotal) * 100) : 0}% of total`,
      icon: Package,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: "Cut & Bend",
      value: `${formatNumber(totalCutAndBend)}`,
      subtitle: `${grandTotal > 0 ? roundTo3Decimals((totalCutAndBend / grandTotal) * 100) : 0}% of total`,
      icon: Wrench,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: "Daily Average",
      value: `${formatNumber(averagePerDay)}`,
      subtitle: "tons per day",
      icon: TrendingUp,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary/10'
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Delivery Overview
        </CardTitle>
        <CardDescription>
          Summary of all delivered orders by type ({allDeliveredOrders.length} orders across {totalDays} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, index) => (
            <div key={index} className="glass-panel rounded-xl p-4 text-center">
              <div className={`p-3 rounded-lg ${card.bgColor} mx-auto mb-3 w-fit shadow-[inset_0_1px_rgba(255,255,255,0.08)]`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar for Order Types */}
        {grandTotal > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Order Type Distribution</span>
              <span>{formatNumber(grandTotal)} tons total</span>
            </div>
            <div className="w-full overflow-hidden rounded-full bg-white/[0.08] h-3">
              <div className="h-full flex">
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${roundTo3Decimals((totalStraightBar / grandTotal) * 100)}%` }}
                  title={`Straight Bar: ${formatNumber(totalStraightBar)} tons`}
                ></div>
                <div
                  className="bg-purple-500 transition-all duration-500"
                  style={{ width: `${roundTo3Decimals((totalCutAndBend / grandTotal) * 100)}%` }}
                  title={`Cut & Bend: ${formatNumber(totalCutAndBend)} tons`}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Straight Bar ({roundTo3Decimals((totalStraightBar / grandTotal) * 100)}%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Cut & Bend ({roundTo3Decimals((totalCutAndBend / grandTotal) * 100)}%)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
