import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Package,
  Weight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, roundTo3Decimals } from '@/lib/utils';
import {
  clientsApi,
  type ClientAnalytics,
  type ClientOrderRow,
  type ClientSitesPerformanceRow,
  type ClientSummaryDetail,
} from '@/lib/clientsApi';

const PAGE_SIZE = 50;

export function ClientProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ClientSummaryDetail | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [sitesPerformance, setSitesPerformance] = useState<ClientSitesPerformanceRow[]>([]);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCoreData = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryData, sitesData] = await Promise.all([
        clientsApi.getClientSummary(clientId),
        clientsApi.getClientSitesPerformance(clientId),
      ]);

      setSummary(summaryData);
      setSitesPerformance(sitesData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client profile');
      setSummary(null);
      setSitesPerformance([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchOrders = useCallback(async () => {
    if (!clientId) return;

    setOrdersLoading(true);
    setOrdersError(null);

    try {
      const offset = (ordersPage - 1) * PAGE_SIZE;
      const { orders: orderRows, total } = await clientsApi.getClientOrdersPage(
        clientId,
        PAGE_SIZE,
        offset
      );

      setOrders(orderRows);
      setOrdersTotal(total);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  }, [clientId, ordersPage]);

  const fetchAnalytics = useCallback(async () => {
    if (!clientId) return;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const analyticsData = await clientsApi.getClientAnalytics(clientId);
      setAnalytics(analyticsData);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to load client analytics:', err.message);
      }
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    setOrdersPage(1);
  }, [clientId]);

  const handlePreviousPage = () => {
    setOrdersPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(ordersTotal / PAGE_SIZE);
    setOrdersPage((prev) => Math.min(totalPages, prev + 1));
  };

  const totalPages = Math.ceil(ordersTotal / PAGE_SIZE);
  const startRecord = ordersTotal > 0 ? (ordersPage - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(ordersPage * PAGE_SIZE, ordersTotal);

  const kpis = {
    totalOrders: summary?.total_orders ?? 0,
    totalTons: summary?.total_tons ?? 0,
    sites: summary?.unique_sites ?? 0,
    lastOrderDate: summary?.last_order_date ?? 'N/A',
  };

  const statusBreakdown = useMemo(() => analytics?.status_breakdown || [], [analytics]);
  const statusTotal = useMemo(
    () => statusBreakdown.reduce((total, row) => total + row.count, 0),
    [statusBreakdown]
  );
  const statusBreakdownWithPercentage = useMemo(
    () =>
      statusBreakdown.map((row) => ({
        ...row,
        percentage: statusTotal > 0 ? (row.count / statusTotal) * 100 : 0,
      })),
    [statusBreakdown, statusTotal]
  );
  const orderTypeBreakdown = useMemo(() => analytics?.order_type_breakdown || [], [analytics]);
  const shiftBreakdown = useMemo(() => analytics?.shift_breakdown || [], [analytics]);
  const diameterBreakdown = useMemo(() => analytics?.diameter_breakdown || [], [analytics]);
  const diameterTotals = useMemo(() => analytics?.diameter_totals, [analytics]);

  const handleSiteClick = (siteId: string) => {
    if (!clientId) return;
    navigate(`/clients/${clientId}/sites/${siteId}`);
  };

  const getStatusBadge = (status: string | null) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      delayed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return statusStyles[status || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleString() : '—';

  if (loading) {
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

  if (error || !summary) {
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

        <Card className="border-destructive">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Unable to Load Client</h3>
                <p className="text-muted-foreground mt-1">
                  {error || 'Please confirm the client exists and try again.'}
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
            {summary.client_name}
          </h1>
          <p className="text-muted-foreground">Client profile and order history</p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdatedLabel}</p>
        </div>
      </div>

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

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order History
              </CardTitle>
              <CardDescription>
                Unified order history from active and archived orders (showing {startRecord}-{endRecord} of {ordersTotal})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading orders...</p>
                  </div>
                </div>
              ) : ordersError ? (
                <div className="text-center py-12 space-y-3">
                  <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                  <div>
                    <p className="font-medium text-foreground">Unable to load orders</p>
                    <p className="text-sm text-muted-foreground">{ordersError}</p>
                  </div>
                  <Button variant="outline" onClick={fetchOrders}>Retry</Button>
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
                        {orders.length > 0 ? (
                          orders.map((order) => (
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
                              <TableCell className="max-w-[150px] truncate" title={order.site || ''}>
                                {order.site || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(order.tons || 0)}
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate" title={order.driver_name || ''}>
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
                                  <p className="text-sm">No orders found for this client.</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Page {ordersPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={ordersPage <= 1 || ordersLoading}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={ordersPage >= totalPages || ordersLoading}
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

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
                <CardDescription>Key client details and totals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Client Name</span>
                  <span className="font-medium text-foreground">{summary.client_name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Client ID</span>
                  <span className="font-mono text-sm text-foreground">{summary.client_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium text-foreground">{kpis.totalOrders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Total Tons</span>
                  <span className="font-medium text-foreground">{formatNumber(kpis.totalTons)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Sites</span>
                  <span className="font-medium text-foreground">{kpis.sites}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Last Order</span>
                  <span className="font-medium text-foreground">{kpis.lastOrderDate}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Sites Performance
                </CardTitle>
                <CardDescription>Performance metrics for delivery sites</CardDescription>
              </CardHeader>
              <CardContent>
                {sitesPerformance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Site</TableHead>
                        <TableHead className="text-foreground text-right">Orders</TableHead>
                        <TableHead className="text-foreground text-right">Tons</TableHead>
                        <TableHead className="text-foreground">Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sitesPerformance.map((row, index) => (
                        <TableRow
                          key={row.site_id}
                          className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleSiteClick(row.site_id)}
                        >
                          <TableCell className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>
                            <span className="font-medium max-w-[300px] truncate" title={row.site_name}>
                              {row.site_name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{row.total_orders.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.total_tons)}</TableCell>
                          <TableCell>{row.last_order_date || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No site data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <Card>
              <CardHeader>
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ) : analyticsError ? (
            <Card className="border-destructive">
              <CardContent className="py-10">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Analytics Unavailable</h3>
                    <p className="text-muted-foreground mt-1">{analyticsError}</p>
                  </div>
                  <Button variant="outline" onClick={fetchAnalytics}>Retry</Button>
                </div>
              </CardContent>
            </Card>
          ) : !analytics || analytics.monthly_tons.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>Charts and breakdowns for this client</CardDescription>
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
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Tons</CardTitle>
                  <CardDescription>Sum of tons grouped by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.monthly_tons}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
                        <XAxis dataKey="month" stroke="hsl(240, 4%, 52%)" fontSize={12} />
                        <YAxis stroke="hsl(240, 4%, 52%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(0, 0%, 100%)',
                            border: '1px solid hsl(240, 4%, 80%)',
                            borderRadius: '8px',
                            color: 'hsl(0, 0%, 12%)',
                          }}
                          formatter={(value: number) => [`${formatNumber(value)} tons`, 'Tons']}
                        />
                        <Bar dataKey="tons" fill="hsl(232, 90%, 62%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

            </>
          )}

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Order count per status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdownWithPercentage.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground text-right">Count</TableHead>
                        <TableHead className="text-foreground text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusBreakdownWithPercentage.map((row) => (
                        <TableRow key={row.status} className="border-border">
                          <TableCell>
                            <Badge className={`${getStatusBadge(row.status)} border`}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{roundTo3Decimals(row.percentage).toFixed(3)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">N/A</div>
                )}
              </CardContent>
            </Card>

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
                        <TableRow key={row.order_type} className="border-border">
                          <TableCell className="capitalize">{row.order_type.replace('-', ' ')}</TableCell>
                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">N/A</div>
                )}
              </CardContent>
            </Card>

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
                  <div className="text-center py-8 text-muted-foreground">N/A</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Diameter Breakdown</CardTitle>
                <CardDescription>Tonnage distribution by bar diameter</CardDescription>
              </CardHeader>
              <CardContent>
                {diameterBreakdown.length > 0 && diameterTotals ? (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diameterBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 80%)" />
                          <XAxis dataKey="diameter" stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <YAxis stroke="hsl(240, 4%, 52%)" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(0, 0%, 100%)',
                              border: '1px solid hsl(240, 4%, 80%)',
                              borderRadius: '8px',
                              color: 'hsl(0, 0%, 12%)',
                            }}
                            formatter={(value: number) => [`${formatNumber(value)} tons`, 'Tons']}
                          />
                          <Bar dataKey="tons" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {diameterTotals.has_mismatch && (
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

            <Card>
              <CardHeader>
                <CardTitle>Diameter Details</CardTitle>
                <CardDescription>Breakdown by bar diameter (% of total tons)</CardDescription>
              </CardHeader>
              <CardContent>
                {diameterBreakdown.length > 0 && diameterTotals ? (
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
                        {diameterBreakdown.map((row) => (
                          <TableRow key={row.diameter} className="border-border">
                            <TableCell className="font-medium">{row.diameter}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.tons)}</TableCell>
                            <TableCell className="text-right">{roundTo3Decimals(row.percentage).toFixed(3)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {diameterTotals.has_mismatch && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Diameter breakdown may not fully match total tons due to rounding or data entry.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No diameter breakdown data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
