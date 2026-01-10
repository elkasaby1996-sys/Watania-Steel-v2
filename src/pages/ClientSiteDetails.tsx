import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Package,
  Weight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clientsApi, type ClientOrderRow, type ClientSitesPerformanceRow, type ClientSummaryDetail } from '@/lib/clientsApi';
import { formatNumber } from '@/lib/utils';

const PAGE_SIZE = 25;

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();

  const [clientSummary, setClientSummary] = useState<ClientSummaryDetail | null>(null);
  const [sitePerformance, setSitePerformance] = useState<ClientSitesPerformanceRow | null>(null);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSiteSummary = useCallback(async () => {
    if (!clientId || !siteId) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryData, siteRows] = await Promise.all([
        clientsApi.getClientSummary(clientId),
        clientsApi.getClientSitesPerformance(clientId),
      ]);

      const siteRow = siteRows.find((row) => row.site_id === siteId) || null;

      if (!siteRow) {
        throw new Error('Site not found for this client');
      }

      setClientSummary(summaryData);
      setSitePerformance(siteRow);
      setOrdersTotal(siteRow.total_orders);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details');
      setClientSummary(null);
      setSitePerformance(null);
      setOrdersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [clientId, siteId]);

  const fetchSiteOrders = useCallback(async () => {
    if (!clientId || !sitePerformance) return;

    setOrdersLoading(true);
    setOrdersError(null);

    if (sitePerformance.total_orders === 0) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    try {
      const targetOffset = (ordersPage - 1) * PAGE_SIZE;
      const targetEnd = targetOffset + PAGE_SIZE;
      const collected: ClientOrderRow[] = [];
      let offset = 0;
      let totalClientOrders = 0;
      let attempts = 0;
      const maxAttempts = 20;

      while (collected.length < targetEnd && attempts < maxAttempts) {
        const { orders: pageRows, total } = await clientsApi.getClientOrdersPage(clientId, PAGE_SIZE, offset);
        totalClientOrders = total;

        if (pageRows.length === 0) {
          break;
        }

        collected.push(...pageRows.filter((row) => row.site === sitePerformance.site_name));
        offset += PAGE_SIZE;
        attempts += 1;

        if (offset >= totalClientOrders) {
          break;
        }
      }

      setOrders(collected.slice(targetOffset, targetEnd));
      setOrdersTotal(sitePerformance.total_orders);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Failed to load site orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [clientId, ordersPage, sitePerformance]);

  useEffect(() => {
    fetchSiteSummary();
  }, [fetchSiteSummary]);

  useEffect(() => {
    fetchSiteOrders();
  }, [fetchSiteOrders]);

  useEffect(() => {
    setOrdersPage(1);
  }, [siteId, clientId]);

  const totalPages = Math.ceil(ordersTotal / PAGE_SIZE);
  const startRecord = ordersTotal > 0 ? (ordersPage - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(ordersPage * PAGE_SIZE, ordersTotal);

  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleString() : '—';

  const statusBadge = useMemo(() => {
    return (status: string | null) => {
      const statusStyles: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        delayed: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      return statusStyles[status || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };
  }, []);

  const handlePreviousPage = () => {
    setOrdersPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setOrdersPage((prev) => Math.min(totalPages, prev + 1));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${clientId}`)}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Client
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">Loading site...</h1>
            <p className="text-muted-foreground">Fetching site details</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading site details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sitePerformance || !clientSummary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${clientId}`)}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Client
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">Site Details</h1>
            <p className="text-muted-foreground">Unable to load this site</p>
          </div>
        </div>

        <Card className="border-destructive">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Failed to Load Site</h3>
                <p className="text-muted-foreground mt-1">{error || 'An unexpected error occurred.'}</p>
              </div>
              <Button variant="outline" onClick={fetchSiteSummary}>
                Try Again
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
          onClick={() => navigate(`/clients/${clientSummary.client_id}`)}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Client
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">{sitePerformance.site_name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {clientSummary.client_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdatedLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Package className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{sitePerformance.total_orders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Weight className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{formatNumber(sitePerformance.total_tons)}</p>
              <p className="text-xs text-muted-foreground">Total Tons</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{sitePerformance.last_order_date || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Last Order</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Site Orders
          </CardTitle>
          <CardDescription>
            Orders for this site (showing {startRecord}-{endRecord} of {ordersTotal})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground text-sm">Loading site orders...</p>
              </div>
            </div>
          ) : ordersError ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <div>
                <p className="font-medium text-foreground">Unable to load site orders</p>
                <p className="text-sm text-muted-foreground">{ordersError}</p>
              </div>
              <Button variant="outline" onClick={fetchSiteOrders}>Retry</Button>
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
                      <TableHead className="text-foreground text-right">Tons</TableHead>
                      <TableHead className="text-foreground">Driver</TableHead>
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
                            <Badge className={`${statusBadge(order.status)} border`}>
                              {order.status || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {order.order_type?.replace('-', ' ') || 'N/A'}
                          </TableCell>
                          <TableCell className="capitalize">{order.shift || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatNumber(order.tons || 0)}</TableCell>
                          <TableCell className="max-w-[120px] truncate" title={order.driver_name || ''}>
                            {order.driver_name || 'N/A'}
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                          <div className="space-y-3">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <div>
                              <p className="font-medium">No Orders Found</p>
                              <p className="text-sm">No orders found for this site.</p>
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
    </div>
  );
}
