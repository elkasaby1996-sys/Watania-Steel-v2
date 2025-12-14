import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Package, CheckCircle, Clock, Weight, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { driverService } from '../lib/supabase';
import { useDriversStore } from '../stores/driversStore';

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Order {
  id: string;
  customer_name: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  amount: number;
  tons: number;
  shift: 'morning' | 'night';
  delivery_number?: string;
  company?: string;
  site?: string;
  driver_name?: string;
  phone_number?: string;
  delivered_at?: string;
}

export function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const { getCurrentCycleDates } = useDriversStore();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cycleMetrics, setCycleMetrics] = useState({
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    total_tons: 0
  });
  const [customMetrics, setCustomMetrics] = useState({
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    total_tons: 0
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Get current cycle dates
  const cycleDates = getCurrentCycleDates();
  const currentCycleStart = getCurrentCycleStartDate();
  const currentCycleEnd = getCurrentCycleEndDate();

  function getCurrentCycleStartDate(): string {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (currentDay >= 25) {
      return new Date(currentYear, currentMonth, 25).toISOString().split('T')[0];
    } else {
      return new Date(currentYear, currentMonth - 1, 25).toISOString().split('T')[0];
    }
  }

  function getCurrentCycleEndDate(): string {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (currentDay >= 25) {
      return new Date(currentYear, currentMonth + 1, 25).toISOString().split('T')[0];
    } else {
      return new Date(currentYear, currentMonth, 25).toISOString().split('T')[0];
    }
  }

  useEffect(() => {
    if (driverId) {
      loadDriverData();
    }
  }, [driverId]);

  useEffect(() => {
    if (driver && startDate && endDate) {
      loadCustomRangeMetrics();
    }
  }, [driver, startDate, endDate]);

  const loadDriverData = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      // Load driver details
      const driverData = await driverService.getById(driverId);
      if (!driverData) {
        navigate('/drivers');
        return;
      }
      setDriver(driverData);

      // Load all orders for this driver
      const allOrders = await driverService.getDriverOrders(driverData.name);
      setOrders(allOrders);

      // Load current cycle metrics
      const metrics = await driverService.getDriverMetricsForDateRange(
        driverData.name,
        currentCycleStart,
        currentCycleEnd
      );
      setCycleMetrics(metrics);

    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomRangeMetrics = async () => {
    if (!driver || !startDate || !endDate) return;

    try {
      const metrics = await driverService.getDriverMetricsForDateRange(
        driver.name,
        startDate,
        endDate
      );
      setCustomMetrics(metrics);
    } catch (error) {
      console.error('Failed to load custom range metrics:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-tertiary text-tertiary-foreground">In Progress</Badge>;
      case 'delayed':
        return <Badge className="bg-warning text-warning-foreground">Delayed</Badge>;
      case 'pending':
        return <Badge className="bg-gray-400 text-white">Pending</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600 text-white">Delivered</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white">{status}</Badge>;
    }
  };

  const getShiftBadge = (shift: string) => {
    return (
      <Badge className={shift === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
        {shift === 'morning' ? 'Morning' : 'Night'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin mx-auto text-primary">⏳</div>
          <p className="text-muted-foreground">Loading driver details...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Driver Not Found</h2>
          <Button onClick={() => navigate('/drivers')}>
            <ArrowLeft size={16} />
            Back to Drivers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/drivers')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Drivers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {driver.name}
          </h1>
          <p className="text-muted-foreground">
            Driver performance and order history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={driver.is_active ? 'bg-success text-success-foreground' : 'bg-gray-400 text-white'}>
            {driver.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Driver Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Driver Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-foreground">{driver.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <a 
                  href={`tel:${driver.phone_number.replace(/[\s\-\(\)]/g, '')}`}
                  className="font-medium text-primary hover:text-primary/80 underline"
                >
                  {driver.phone_number}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium text-foreground">
                  {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Cycle Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Cycle Performance
          </CardTitle>
          <CardDescription>
            Performance metrics for {cycleDates.start} - {cycleDates.end}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{cycleMetrics.total_orders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{cycleMetrics.completed_orders}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{cycleMetrics.pending_orders}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <Weight className="h-8 w-8 text-tertiary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{cycleMetrics.total_tons}</p>
              <p className="text-sm text-muted-foreground">Total Tons</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Custom Date Range Analysis
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomRange(!showCustomRange)}
            >
              {showCustomRange ? 'Hide' : 'Show'} Custom Range
            </Button>
          </CardTitle>
        </CardHeader>
        {showCustomRange && (
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              {startDate && endDate && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{customMetrics.total_orders}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{customMetrics.completed_orders}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{customMetrics.pending_orders}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{customMetrics.total_tons}</p>
                    <p className="text-sm text-muted-foreground">Total Tons</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order History
          </CardTitle>
          <CardDescription>
            Complete order history for {driver.name} ({orders.length} orders total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Order ID</TableHead>
                  <TableHead className="text-foreground">Customer</TableHead>
                  <TableHead className="text-foreground">Date</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Tons</TableHead>
                  <TableHead className="text-foreground">Shift</TableHead>
                  <TableHead className="text-foreground">Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-foreground">{order.id}</TableCell>
                      <TableCell className="text-foreground">{order.customer_name}</TableCell>
                      <TableCell className="text-foreground">{order.date}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-foreground">{order.tons} tons</TableCell>
                      <TableCell>{getShiftBadge(order.shift)}</TableCell>
                      <TableCell className="text-foreground">{order.company || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No orders found for this driver yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
