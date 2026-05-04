import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Truck, Package, Weight, Calendar, TrendingUp } from 'lucide-react';
import { useDriversStore } from '../stores/driversStore';
import { roundTo3Decimals, formatNumber } from '../lib/utils';

export function DriversMetrics() {
  const driversStore = useDriversStore();
  
  // Safe access to store data
  const metrics = driversStore?.metrics || [];
  const getCurrentCycleDates = driversStore?.getCurrentCycleDates || (() => ({ start: 'N/A', end: 'N/A' }));
  
  // Safe cycle dates calculation
  let cycleDates = { start: 'N/A', end: 'N/A' };
  try {
    cycleDates = getCurrentCycleDates();
  } catch (error) {
    console.error('Error getting cycle dates:', error);
  }

  // Calculate overall metrics safely
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const totalDrivers = safeMetrics.length;
  const activeDrivers = safeMetrics.filter(m => m && m.is_active).length;
  const totalOrders = safeMetrics.reduce((sum, m) => sum + (m?.total_orders || 0), 0);
  const totalCompletedOrders = safeMetrics.reduce((sum, m) => sum + (m?.completed_orders || 0), 0);
  const totalTons = safeMetrics.reduce((sum, m) => sum + (m?.total_tons || 0), 0);
  const averageOrdersPerDriver = totalDrivers > 0 ? roundTo3Decimals(totalOrders / totalDrivers) : 0;

  const metricsCards = [
    {
      title: "Total Drivers",
      value: totalDrivers,
      subtitle: `${activeDrivers} active`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: "Total Orders",
      value: totalOrders,
      subtitle: `${totalCompletedOrders} completed`,
      icon: Package,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary/10'
    },
    {
      title: "Total Tons Delivered",
      value: `${formatNumber(totalTons)}`,
      subtitle: "tons",
      icon: Weight,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: "Avg Orders/Driver",
      value: formatNumber(averageOrdersPerDriver),
      subtitle: "per cycle",
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cycle Period Info */}
      <Card className="border-white/[0.14] bg-[var(--glass-panel)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Current Cycle Period
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Metrics are calculated from the 25th of each month to the 25th of the following month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="light-readable-primary-badge border-primary/35 bg-primary/20 text-primary-foreground">
              {cycleDates.start} - {cycleDates.end}
            </Badge>
            <span className="text-sm text-muted-foreground">Current reporting period</span>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {metricsCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground">{card.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{card.subtitle}</p>
                </div>
                <div className={`rounded-xl border border-white/[0.1] p-3 shadow-[inset_0_1px_rgba(255,255,255,0.08)] ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Top Performing Drivers (Current Cycle)
          </CardTitle>
          <CardDescription>
            Drivers ranked by total completed orders in the current cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {safeMetrics
              .filter(m => m && m.total_orders > 0)
              .sort((a, b) => (b?.completed_orders || 0) - (a?.completed_orders || 0))
              .slice(0, 5)
              .map((driver, index) => (
                <div key={driver.driver_id} className="flex flex-col gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{driver.driver_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {driver.phone_number}
                      </p>
                    </div>
                    {!driver.is_active && (
                      <Badge variant="outline" className="shrink-0 text-xs">Inactive</Badge>
                    )}
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="font-bold text-foreground">{driver.completed_orders} orders</p>
                    <p className="text-sm text-muted-foreground">{formatNumber(driver.total_tons)} tons</p>
                  </div>
                </div>
              ))}
            {safeMetrics.filter(m => m && m.total_orders > 0).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No orders completed in the current cycle yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
