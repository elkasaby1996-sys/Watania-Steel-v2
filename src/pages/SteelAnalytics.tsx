import React, { useState } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Package, Calculator, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../stores/dashboardStore';

export function SteelAnalytics() {
  const navigate = useNavigate();
  const { orders, historyOrders } = useDashboardStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');

  // Combine active orders and history orders for complete steel analysis
  const allOrders = [
    ...orders,
    ...historyOrders.map(historyOrder => ({
      id: historyOrder.id,
      customerName: historyOrder.customer_name,
      date: historyOrder.date,
      status: historyOrder.status,
      amount: historyOrder.amount,
      tons: historyOrder.tons,
      shift: historyOrder.shift,
      deliveryNumber: historyOrder.delivery_number,
      company: historyOrder.company,
      site: historyOrder.site,
      driverName: historyOrder.driver_name,
      phoneNumber: historyOrder.phone_number,
      deliveredAt: historyOrder.delivered_at,
      signedDeliveryNote: historyOrder.signed_delivery_note,
      orderType: historyOrder.order_type,
      breakdown: {
        '8mm': historyOrder.breakdown_8mm || 0,
        '10mm': historyOrder.breakdown_10mm || 0,
        '12mm': historyOrder.breakdown_12mm || 0,
        '14mm': historyOrder.breakdown_14mm || 0,
        '16mm': historyOrder.breakdown_16mm || 0,
        '18mm': historyOrder.breakdown_18mm || 0,
        '20mm': historyOrder.breakdown_20mm || 0,
        '25mm': historyOrder.breakdown_25mm || 0,
        '32mm': historyOrder.breakdown_32mm || 0,
      }
    }))
  ];

  // Calculate date range based on time range selection
  const getDateRange = () => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    switch (timeRange) {
      case 'daily':
        start = end; // Today only
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'monthly':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        start = monthAgo.toISOString().split('T')[0];
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
    }

    return { start, end };
  };

  const dateRange = getDateRange();

  // Filter orders by date range (include all orders with steel breakdown data)
  const filteredOrders = allOrders.filter(order => {
    // Include both delivered orders and orders with breakdown data
    const hasBreakdown = order.breakdown && Object.values(order.breakdown).some(tons => tons > 0);
    if (!hasBreakdown) return false;
    
    const orderDate = order.deliveredAt ? order.deliveredAt.split('T')[0] : order.date;
    
    if (dateRange.start && orderDate < dateRange.start) return false;
    if (dateRange.end && orderDate > dateRange.end) return false;
    
    return true;
  });

  // Calculate tons vs time data for line chart
  const tonsVsTimeData = filteredOrders
    .reduce((acc, order) => {
      const date = order.deliveredAt ? order.deliveredAt.split('T')[0] : order.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += order.tons || 0;
      return acc;
    }, {} as { [date: string]: number });

  const lineChartData = Object.entries(tonsVsTimeData)
    .map(([date, tons]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tons: Math.round(tons * 100) / 100,
      fullDate: date
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  // Calculate steel breakdown for pie chart
  const steelBreakdown = filteredOrders
    .filter(order => order.breakdown)
    .reduce((acc, order) => {
      if (order.breakdown) {
        Object.entries(order.breakdown).forEach(([size, tons]) => {
          if (!acc[size]) acc[size] = 0;
          acc[size] += tons || 0;
        });
      }
      return acc;
    }, {} as { [key: string]: number });

  const pieChartData = Object.entries(steelBreakdown)
    .map(([size, tons]) => ({
      name: size,
      value: Math.round(tons * 100) / 100,
      tons: Math.round(tons * 100) / 100
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  // Calculate total for percentages
  const totalSteelTons = pieChartData.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentages to pie chart data
  const pieChartDataWithPercentages = pieChartData.map(item => ({
    ...item,
    percentage: totalSteelTons > 0 ? Math.round((item.value / totalSteelTons) * 100) : 0
  }));

  // Colors for pie chart
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
    '#ff00ff', '#00ffff', '#ff0000', '#0000ff'
  ];

  // Calculate monthly average
  const totalTons = Object.values(tonsVsTimeData).reduce((sum, tons) => sum + tons, 0);
  const uniqueDays = Object.keys(tonsVsTimeData).length;
  const dailyAverage = uniqueDays > 0 ? totalTons / uniqueDays : 0;
  
  // Calculate monthly average (daily average * 30)
  const monthlyAverage = dailyAverage * 30;

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setTimeRange('monthly');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Steel Analytics
          </h1>
          <p className="text-muted-foreground">
            Detailed breakdown and analysis of steel bar usage
          </p>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time Range Configuration
          </CardTitle>
          <CardDescription>
            Configure the time period for steel analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select
                value={timeRange}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'custom') => setTimeRange(value)}
              >
                <SelectTrigger id="time-range" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">Last 7 Days</SelectItem>
                  <SelectItem value="monthly">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {timeRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-background text-foreground border-border"
                  />
                </div>
              </>
            )}
            
            <Button
              onClick={clearDateFilter}
              variant="outline"
              className="h-9"
            >
              Reset
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              Analyzing: {dateRange.start || 'All time'} to {dateRange.end || 'Present'} 
              ({filteredOrders.length} orders with steel breakdown data)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Data from: {orders.length} active orders + {historyOrders.length} delivered orders
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Average Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Average
          </CardTitle>
          <CardDescription>
            Average steel delivery calculated from daily averages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
              <Calculator className="h-12 w-12 text-primary" />
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {Math.round(monthlyAverage * 100) / 100}
            </p>
            <p className="text-lg text-muted-foreground mb-4">tons per month</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Daily Average</p>
                <p className="font-semibold text-foreground">{Math.round(dailyAverage * 100) / 100} tons</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Days</p>
                <p className="font-semibold text-foreground">{uniqueDays} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tons vs Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tons vs Time</CardTitle>
            <CardDescription>Steel delivery trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(240, 4%, 52%)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(240, 4%, 52%)"
                    fontSize={12}
                    label={{ value: 'Tons', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(240, 4%, 80%)',
                      borderRadius: '8px',
                      color: 'hsl(0, 0%, 12%)'
                    }}
                    formatter={(value) => [`${value} tons`, 'Total Delivered']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tons" 
                    stroke="hsl(340, 80%, 30%)" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(340, 80%, 30%)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(340, 80%, 30%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Steel Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Steel Size Distribution</CardTitle>
            <CardDescription>Breakdown by steel bar diameter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartDataWithPercentages}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartDataWithPercentages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(240, 4%, 80%)',
                      borderRadius: '8px',
                      color: 'hsl(0, 0%, 12%)'
                    }}
                    formatter={(value, name, props) => [
                      `${props.payload.name} ${props.payload.percentage}%`,
                      ''
                    ]}
                    labelFormatter={() => ''}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {pieChartDataWithPercentages.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-foreground">
                    {item.name}: {item.tons}t ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
