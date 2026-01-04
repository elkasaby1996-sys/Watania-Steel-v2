import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Package,
  MapPin,
  FileText,
  BarChart3,
  Loader2,
  AlertCircle,
  Calendar,
  Weight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useClientsStore } from '@/stores/clientsStore';
import { formatNumber, roundTo3Decimals } from '@/lib/utils';

const PAGE_SIZE = 200;

export function ClientDetail() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const navigate = useNavigate();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const {
    selectedClient,
    clientOrders,
    clientOrdersTotal,
    clientOrdersPage,
    clientOrdersLoading,
    loadClientBySlug,
    loadClientOrders,
    setClientOrdersPage,
    clearClientDetail,
  } = useClientsStore();

  useEffect(() => {
    const loadData = async () => {
      if (!clientSlug) return;

      setIsInitialLoading(true);
      const client = await loadClientBySlug(clientSlug);

      if (client) {
        await loadClientOrders(client.company, 1);
      }
      setIsInitialLoading(false);
    };

    loadData();

    return () => {
      clearClientDetail();
    };
  }, [clientSlug]);

  const client = selectedClient;

  // KPI data
  const kpis = {
    totalOrders: client?.totalOrders ?? 0,
    totalTons: client?.totalTons ?? 0,
    totalAmount: client?.totalAmount ?? 0,
    sites: client?.uniqueSitesCount ?? 0,
    lastOrderDate: client?.lastOrderDate ?? 'N/A',
  };

  // Pagination calculations
  const totalPages = Math.ceil(clientOrdersTotal / PAGE_SIZE);
  const startRecord = clientOrdersTotal > 0 ? (clientOrdersPage - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(clientOrdersPage * PAGE_SIZE, clientOrdersTotal);

  const handlePreviousPage = () => {
    if (clientOrdersPage > 1 && client) {
      loadClientOrders(client.company, clientOrdersPage - 1);
    }
  };

  const handleNextPage = () => {
    if (clientOrdersPage < totalPages && client) {
      loadClientOrders(client.company, clientOrdersPage + 1);
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'completed': 'bg-green-500/20 text-green-400 border-green-500/30',
      'delivered': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'delayed': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return statusStyles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Compute monthly analytics from clientOrders
  const monthlyAnalytics = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return { monthlyTons: [], monthlyAmount: [] };
    }

    const monthMap: Record<string, { tons: number; amount: number }> = {};

    clientOrders.forEach((order) => {
      if (!order.date) return;
      const d = new Date(order.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { tons: 0, amount: 0 };
      }
      monthMap[key].tons += order.tons || 0;
      monthMap[key].amount += order.amount || 0;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    const monthlyTons = sortedMonths.map((m) => {
      const [year, month] = m.split('-');
      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month: label, tons: roundTo3Decimals(monthMap[m].tons) };
    });
    const monthlyAmount = sortedMonths.map((m) => {
      const [year, month] = m.split('-');
      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month: label, amount: roundTo3Decimals(monthMap[m].amount) };
    });

    return { monthlyTons, monthlyAmount };
  }, [clientOrders]);

  // Compute Status Breakdown from clientOrders
  const statusBreakdown = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return [];
    }

    const totalOrders = clientOrders.length;
    const statusMap: Record<string, number> = {};

    clientOrders.forEach((order) => {
      const status = order.status?.trim() || 'N/A';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.entries(statusMap)
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalOrders > 0 ? roundTo3Decimals((count / totalOrders) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [clientOrders]);

  // Compute Order Type Breakdown from clientOrders
  const orderTypeBreakdown = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return [];
    }

    const typeMap: Record<string, { count: number; tons: number; amount: number }> = {};

    clientOrders.forEach((order) => {
      const orderType = order.order_type?.trim() || 'N/A';
      if (!typeMap[orderType]) {
        typeMap[orderType] = { count: 0, tons: 0, amount: 0 };
      }
      typeMap[orderType].count += 1;
      typeMap[orderType].tons += order.tons || 0;
      typeMap[orderType].amount += order.amount || 0;
    });

    return Object.entries(typeMap)
      .map(([orderType, data]) => ({
        orderType,
        count: data.count,
        tons: roundTo3Decimals(data.tons),
        amount: roundTo3Decimals(data.amount),
      }))
      .sort((a, b) => b.count - a.count);
  }, [clientOrders]);

  // Compute Shift Breakdown from clientOrders
  const shiftBreakdown = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return [];
    }

    const shiftMap: Record<string, { count: number; tons: number; amount: number }> = {};

    clientOrders.forEach((order) => {
      const shift = order.shift?.trim() || 'N/A';
      if (!shiftMap[shift]) {
        shiftMap[shift] = { count: 0, tons: 0, amount: 0 };
      }
      shiftMap[shift].count += 1;
      shiftMap[shift].tons += order.tons || 0;
      shiftMap[shift].amount += order.amount || 0;
    });

    return Object.entries(shiftMap)
      .map(([shift, data]) => ({
        shift,
        count: data.count,
        tons: roundTo3Decimals(data.tons),
        amount: roundTo3Decimals(data.amount),
      }))
      .sort((a, b) => b.count - a.count);
  }, [clientOrders]);

  // Compute Diameter Breakdown from clientOrders
  const diameterBreakdown = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return { data: [], totalBreakdownTons: 0, totalOrderTons: 0, hasMismatch: false };
    }

    const diameters = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] as const;
    const breakdownSums: Record<string, number> = {};
    diameters.forEach((d) => (breakdownSums[d] = 0));

    let totalOrderTons = 0;

    clientOrders.forEach((order) => {
      totalOrderTons += order.tons || 0;
      breakdownSums['8mm'] += Number(order.breakdown_8mm) || 0;
      breakdownSums['10mm'] += Number(order.breakdown_10mm) || 0;
      breakdownSums['12mm'] += Number(order.breakdown_12mm) || 0;
      breakdownSums['14mm'] += Number(order.breakdown_14mm) || 0;
      breakdownSums['16mm'] += Number(order.breakdown_16mm) || 0;
      breakdownSums['18mm'] += Number(order.breakdown_18mm) || 0;
      breakdownSums['20mm'] += Number(order.breakdown_20mm) || 0;
      breakdownSums['25mm'] += Number(order.breakdown_25mm) || 0;
      breakdownSums['32mm'] += Number(order.breakdown_32mm) || 0;
    });

    const totalBreakdownTons = Object.values(breakdownSums).reduce((sum, v) => sum + v, 0);
    const hasMismatch = Math.abs(totalBreakdownTons - totalOrderTons) > 0.01;

    const data = diameters.map((diameter) => ({
      diameter,
      tons: roundTo3Decimals(breakdownSums[diameter]),
      percentage: totalBreakdownTons > 0 ? roundTo3Decimals((breakdownSums[diameter] / totalBreakdownTons) * 100) : 0,
    }));

    return { data, totalBreakdownTons: roundTo3Decimals(totalBreakdownTons), totalOrderTons: roundTo3Decimals(totalOrderTons), hasMismatch };
  }, [clientOrders]);

  // Compute Sites Performance data from clientOrders
  const sitesPerformance = useMemo(() => {
    if (!clientOrders || clientOrders.length === 0) {
      return [];
    }

    const siteMap: Record<string, { count: number; tons: number; amount: number }> = {};

    clientOrders.forEach((order) => {
      const site = order.site?.trim() || 'Unknown';
      if (!siteMap[site]) {
        siteMap[site] = { count: 0, tons: 0, amount: 0 };
      }
      siteMap[site].count += 1;
      siteMap[site].tons += order.tons || 0;
      siteMap[site].amount += order.amount || 0;
    });

    return Object.entries(siteMap)
      .map(([site, data]) => ({
        site,
        count: data.count,
        tons: roundTo3Decimals(data.tons),
        amount: roundTo3Decimals(data.amount),
      }))
      .sort((a, b) => b.tons - a.tons);
  }, [clientOrders]);

  // Loading State
  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Clients
          </Button>
          <div className="flex-1">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading client details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Clients
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              Client Not Found
            </h1>
            <p className="text-muted-foreground">
              The requested client could not be found
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Client Not Found</h3>
                <p className="text-muted-foreground mt-1">
                  No client matching "{clientSlug}" was found in the database.
                </p>
              </div>
              <Button onClick={() => navigate('/clients')}>
                View All Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/clients')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {client.company}
          </h1>
          <p className="text-muted-foreground">
            Client profile and order history
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Package className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{kpis.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Weight className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{formatNumber(kpis.totalTons)}</p>
              <p className="text-xs text-muted-foreground">Total Tons</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{kpis.sites}</p>
              <p className="text-xs text-muted-foreground">Sites</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{kpis.lastOrderDate}</p>
              <p className="text-xs text-muted-foreground">Last Order</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <FileText className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab - Primary Focus */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order History
              </CardTitle>
              <CardDescription>
                Unified order history from active orders and history (showing {startRecord}-{endRecord} of {clientOrdersTotal})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientOrdersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading orders...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-foreground">ID</TableHead>
                          <TableHead className="text-foreground">Date</TableHead>
                          <TableHead className="text-foreground">Status</TableHead>
                          <TableHead className="text-foreground">Type</TableHead>
                          <TableHead className="text-foreground">Shift</TableHead>
                          <TableHead className="text-foreground">Site</TableHead>
                          <TableHead className="text-foreground text-right">Tons</TableHead>
                          <TableHead className="text-foreground">Driver</TableHead>
                          <TableHead className="text-foreground">Delivered</TableHead>
                          <TableHead className="text-foreground">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientOrders.length > 0 ? (
                          clientOrders.map((order) => (
                            <TableRow key={`${order.source}-${order.id}`} className="border-border">
                              <TableCell className="font-mono text-sm">
                                {order.delivery_number || order.id}
                              </TableCell>
                              <TableCell>{order.date || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge className={`${getStatusBadge(order.status)} border`}>
                                  {order.status || 'unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">
                                {order.order_type?.replace('-', ' ') || 'N/A'}
                              </TableCell>
                              <TableCell className="capitalize">{order.shift || 'N/A'}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={order.site}>
                                {order.site || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(order.tons || 0)}
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate" title={order.driver_name}>
                                {order.driver_name || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {order.source === 'history_orders' ? 'History' : 'Active'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                              <div className="space-y-3">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                <div>
                                  <p className="font-medium">No Orders Found</p>
                                  <p className="text-sm">
                                    No orders found for this client.
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Page {clientOrdersPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={clientOrdersPage <= 1 || clientOrdersLoading}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={clientOrdersPage >= totalPages || clientOrdersLoading}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>Basic client details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Company Name</span>
                  <span className="font-medium text-foreground">{client.company}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium text-foreground">{client.totalOrders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Total Tons</span>
                  <span className="font-medium text-foreground">{formatNumber(client.totalTons)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Key metrics for this client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Unique Sites</span>
                  <span className="font-medium text-foreground">{client.uniqueSitesCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Last Order Date</span>
                  <span className="font-medium text-foreground">{client.lastOrderDate || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {clientOrdersLoading ? (
            // Skeleton loaders
            <Card>
              <CardHeader>
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ) : monthlyAnalytics.monthlyTons.length === 0 ? (
            // Empty state
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  Charts and breakdowns for this client
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="font-medium text-foreground">No Analytics Data</p>
                    <p className="text-sm text-muted-foreground">
                      No order data with valid dates available for this client.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Charts
            <>
              {/* Monthly Tons Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Tons</CardTitle>
                  <CardDescription>Sum of tons grouped by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyAnalytics.monthlyTons.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyAnalytics.monthlyTons}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
                          <XAxis dataKey="month" stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <YAxis stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(0, 0%, 100%)',
                              border: '1px solid hsl(240, 4%, 80%)',
                              borderRadius: '8px',
                              color: 'hsl(0, 0%, 12%)'
                            }}
                            formatter={(value: number) => [`${formatNumber(value)} tons`, 'Tons']}
                          />
                          <Bar dataKey="tons" fill="hsl(232, 90%, 62%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      N/A
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Breakdown Tables */}
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Order count per status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground text-right">Count</TableHead>
                        <TableHead className="text-foreground text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusBreakdown.map((row) => (
                        <TableRow key={row.status} className="border-border">
                          <TableCell>
                            <Badge className={`${getStatusBadge(row.status)} border`}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.percentage.toFixed(3)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    N/A
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Order Type Breakdown</CardTitle>
                <CardDescription>Orders grouped by type</CardDescription>
              </CardHeader>
              <CardContent>
                {orderTypeBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Type</TableHead>
                        <TableHead className="text-foreground text-right">Orders</TableHead>
                        <TableHead className="text-foreground text-right">Tons</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderTypeBreakdown.map((row) => (
                        <TableRow key={row.orderType} className="border-border">
                          <TableCell className="capitalize">{row.orderType.replace('-', ' ')}</TableCell>
                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    N/A
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shift Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Shift Breakdown</CardTitle>
                <CardDescription>Orders grouped by shift</CardDescription>
              </CardHeader>
              <CardContent>
                {shiftBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Shift</TableHead>
                        <TableHead className="text-foreground text-right">Orders</TableHead>
                        <TableHead className="text-foreground text-right">Tons</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftBreakdown.map((row) => (
                        <TableRow key={row.shift} className="border-border">
                          <TableCell className="capitalize">{row.shift}</TableCell>
                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    N/A
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Diameter Breakdown Section */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Diameter Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Diameter Breakdown</CardTitle>
                <CardDescription>Tonnage distribution by bar diameter</CardDescription>
              </CardHeader>
              <CardContent>
                {diameterBreakdown.data.length > 0 && diameterBreakdown.totalBreakdownTons > 0 ? (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diameterBreakdown.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
                          <XAxis dataKey="diameter" stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <YAxis stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(0, 0%, 100%)',
                              border: '1px solid hsl(240, 4%, 80%)',
                              borderRadius: '8px',
                              color: 'hsl(0, 0%, 12%)'
                            }}
                            formatter={(value: number, name: string) => [
                              `${formatNumber(value)} tons`,
                              'Tons'
                            ]}
                          />
                          <Bar dataKey="tons" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {diameterBreakdown.hasMismatch && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Diameter breakdown may not fully match total tons due to rounding or data entry.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No diameter breakdown data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diameter Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Diameter Details</CardTitle>
                <CardDescription>Breakdown by bar diameter (% of total tons)</CardDescription>
              </CardHeader>
              <CardContent>
                {diameterBreakdown.data.length > 0 && diameterBreakdown.totalBreakdownTons > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-foreground">Diameter</TableHead>
                          <TableHead className="text-foreground text-right">Tons</TableHead>
                          <TableHead className="text-foreground text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diameterBreakdown.data.map((row) => (
                          <TableRow key={row.diameter} className="border-border">
                            <TableCell className="font-medium">{row.diameter}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                            <TableCell className="text-right">{row.percentage.toFixed(3)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {diameterBreakdown.hasMismatch && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Diameter breakdown may not fully match total tons due to rounding or data entry.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No diameter breakdown data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sites Performance Section */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Sites Performance
              </CardTitle>
              <CardDescription>Performance metrics for construction sites associated with this client</CardDescription>
            </CardHeader>
            <CardContent>
              {sitesPerformance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Site</TableHead>
                      <TableHead className="text-foreground text-right">Tons</TableHead>
                      <TableHead className="text-foreground text-right">Amount</TableHead>
                      <TableHead className="text-foreground text-right">Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sitesPerformance.map((row, index) => (
                      <TableRow key={row.site} className="border-border">
                        <TableCell className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>
                          <span className="font-medium max-w-[300px] truncate" title={row.site}>{row.site}</span>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.amount)}</TableCell>
                        <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No site data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
