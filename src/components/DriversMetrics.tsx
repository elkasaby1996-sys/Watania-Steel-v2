import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Truck, Package, Weight, Calendar, TrendingUp } from 'lucide-react';
import { useDriversStore } from '../stores/driversStore';

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
  const averageOrdersPerDriver = totalDrivers > 0 ? Math.round(totalOrders / totalDrivers * 10) / 10 : 0;

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
      value: `${Math.round(totalTons * 10) / 10}`,
      subtitle: "tons",
      icon: Weight,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: "Avg Orders/Driver",
      value: averageOrdersPerDriver,
      subtitle: "per cycle",
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cycle Period Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800 text-lg">
            <Calendar className="h-5 w-5" />
            Current Cycle Period
          </CardTitle>
          <CardDescription className="text-blue-700">
            Metrics are calculated from the 25th of each month to the 25th of the following month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              {cycleDates.start} - {cycleDates.end}
            </Badge>
            <span className="text-sm text-blue-700">Current reporting period</span>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
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
                <div key={driver.driver_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{driver.driver_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.phone_number}
                      </p>
                    </div>
                    {!driver.is_active && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{driver.completed_orders} orders</p>
                    <p className="text-sm text-muted-foreground">{driver.total_tons} tons</p>
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
