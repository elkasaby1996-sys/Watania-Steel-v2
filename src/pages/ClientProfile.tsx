import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditClientDialog } from '@/components/EditClientDialog';
import { MergeSitesDialog } from '@/components/MergeSitesDialog';
import { hasPermission } from '@/lib/auth';
import { formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import {
  fetchClientAnalytics,
  fetchClientOrdersPage,
  fetchClientSitesPerformance,
  fetchClientSummary,
  fetchClientsSummary,
  mergeClients,
  type ClientAnalytics,
  type ClientOrderRow,
  type ClientSitePerformanceRow,
  type ClientSummary,
  type ClientTopSummary
} from '@/lib/clientsApi';
import { useAuthStore } from '@/stores/authStore';

const COLORS = [
  '#8B5CF6',
  '#14B8A6',
  '#F59E0B',
  '#EC4899',
  '#10B981',
  '#F97316',
  '#06B6D4',
  '#EF4444'
];

const isAbortError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as any).name) : '';
  const message = 'message' in err ? String((err as any).message) : '';
  return name === 'AbortError' || message.toLowerCase().includes('abort');
};

const formatTons = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value)} t`;
};

const formatMonthLabel = (value: string) => {
  if (!value) return '—';
  if (value.includes('-')) {
    const date = new Date(`${value}-01T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  }
  return value;
};

export function ClientProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = hasPermission(user?.profile?.role, 'edit');
  const canMerge = hasPermission(user?.profile?.role, 'delete');

  const [summary, setSummary] = useState<ClientTopSummary | null>(null);
  const [sites, setSites] = useState<ClientSitePerformanceRow[]>([]);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { role: userRole, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';

  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeResults, setMergeResults] = useState<ClientSummary[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [selectedDuplicate, setSelectedDuplicate] = useState<ClientSummary | null>(null);
  const [mergePending, setMergePending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refreshSummaryAndSites = async () => {
    if (!clientId) return;
    try {
      const [summaryResult, sitesResult] = await Promise.all([
        fetchClientSummary(clientId),
        fetchClientSitesPerformance(clientId)
      ]);
      setSummary(summaryResult);
      setSites(sitesResult);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshSummaryAndSites = async () => {
    if (!clientId) return;
    try {
      const [summaryResult, sitesResult] = await Promise.all([
        fetchClientSummary(clientId),
        fetchClientSitesPerformance(clientId)
      ]);
      setSummary(summaryResult);
      setSites(sitesResult);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);
    setAnalyticsError(null);

    const loadProfile = async () => {
      setPage(1);
      const [summaryResult, sitesResult, ordersResult, analyticsResult] = await Promise.allSettled([
        fetchClientSummary(clientId, signal),
        fetchClientSitesPerformance(clientId, signal),
        fetchClientOrdersPage(clientId, 1, pageSize, signal),
        fetchClientAnalytics(clientId, signal)
      ]);

      if (signal.aborted) return;

      let loadError: string | null = null;

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        loadError = summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Failed to load summary.';
      }

      if (sitesResult.status === 'fulfilled') {
        setSites(sitesResult.value);
      } else {
        loadError = loadError ?? (sitesResult.reason instanceof Error ? sitesResult.reason.message : 'Failed to load sites.');
      }

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value.rows);
        setOrdersTotal(ordersResult.value.totalCount);
      } else {
        loadError = loadError ?? (ordersResult.reason instanceof Error ? ordersResult.reason.message : 'Failed to load orders.');
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      } else {
        setAnalytics(null);
        setAnalyticsError(analyticsResult.reason instanceof Error ? analyticsResult.reason.message : 'Failed to load analytics.');
      }

      setLoading(false);
      setOrdersLoading(false);
      setAnalyticsLoading(false);
      if (loadError) setError(loadError);
    };

    loadProfile();

    return () => controller.abort();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const pageData = await fetchClientOrdersPage(clientId, page, pageSize, signal);
        if (signal.aborted) return;
        setOrders(pageData.rows);
        setOrdersTotal(pageData.totalCount);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error(err);
      } finally {
        if (!signal.aborted) setOrdersLoading(false);
      }
    };

    if (page !== 1) {
      loadOrders();
    }

    return () => controller.abort();
  }, [clientId, page, pageSize]);

  useEffect(() => {
    if (!clientId || !isAdmin) return;
    const controller = new AbortController();
    const { signal } = controller;

    setMergeLoading(true);
    setMergeError(null);

    const timeout = setTimeout(async () => {
      try {
        const data = await fetchClientsSummary(mergeSearch, signal);
        if (signal.aborted) return;
        const filtered = data.filter((client) => client.id !== clientId);
        setMergeResults(filtered);
      } catch (err) {
        if (isAbortError(err)) return;
        setMergeResults([]);
        setMergeError(err instanceof Error ? err.message : 'Failed to load clients.');
      } finally {
        if (!signal.aborted) setMergeLoading(false);
      }
    }, mergeSearch ? 300 : 0);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [clientId, isAdmin, mergeSearch]);

  const handleRetryAnalytics = async () => {
    if (!clientId) return;
    const controller = new AbortController();
    const signal = controller.signal;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const data = await fetchClientAnalytics(clientId, signal);
      if (!signal.aborted) setAnalytics(data);
    } catch (err) {
      if (isAbortError(err)) return;
      setAnalytics(null);
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      if (!signal.aborted) setAnalyticsLoading(false);
    }
  };

  const totalPages = useMemo(() => {
    if (!ordersTotal) return 1;
    return Math.max(1, Math.ceil(ordersTotal / pageSize));
  }, [ordersTotal, pageSize]);

  const monthlyTons = useMemo(() => {
    const items = Array.isArray(analytics?.monthly_tons) ? analytics?.monthly_tons : [];
    return items.map((entry: any) => ({
      month: formatMonthLabel(String(entry?.month ?? entry?.label ?? entry?.month_label ?? '')),
      tons: Number(entry?.tons ?? 0)
    }));
  }, [analytics]);

  const normalizeBreakdown = (items: any[], labelKey: string) =>
    items.map((item) => ({
      label: String(item?.[labelKey] ?? item?.label ?? 'Unknown'),
      orders: Number(item?.orders ?? item?.count ?? 0),
      tons: Number(item?.tons ?? 0)
    }));

  const statusBreakdown = useMemo(() => {
    const items = Array.isArray(analytics?.status_breakdown) ? analytics?.status_breakdown : [];
    return normalizeBreakdown(items, 'status');
  }, [analytics]);

  const orderTypeBreakdown = useMemo(() => {
    const items = Array.isArray(analytics?.order_type_breakdown) ? analytics?.order_type_breakdown : [];
    return normalizeBreakdown(items, 'order_type');
  }, [analytics]);

  const shiftBreakdown = useMemo(() => {
    const items = Array.isArray(analytics?.shift_breakdown) ? analytics?.shift_breakdown : [];
    return normalizeBreakdown(items, 'shift');
  }, [analytics]);

  const diameterBreakdown = useMemo(() => {
    const items = Array.isArray(analytics?.diameter_breakdown) ? analytics?.diameter_breakdown : [];
    return items.map((item: any) => ({
      label: String(item?.label ?? item?.diameter ?? 'Unknown'),
      tons: Number(item?.tons ?? 0)
    }));
  }, [analytics]);

  const diameterTotal = useMemo(
    () => diameterBreakdown.reduce((sum, entry) => sum + entry.tons, 0),
    [diameterBreakdown]
  );

  const diameterDetails = useMemo(() => {
    if (!diameterTotal) return [];
    return diameterBreakdown.map((entry) => ({
      ...entry,
      percentage: Math.round((entry.tons / diameterTotal) * 1000) / 10
    }));
  }, [diameterBreakdown, diameterTotal]);

  const topStats = useMemo(() => {
    return {
      totalTons: summary?.total_tons ?? 0,
      totalOrders: summary?.total_orders ?? 0,
      uniqueSites: summary?.unique_sites ?? 0,
      lastDate: summary?.last_order_date ?? null
    };
  }, [summary]);

  const handleMergeClients = async () => {
    if (!clientId || !selectedDuplicate) return;
    if (!isAdmin) {
      toast({
        title: 'Admin access required',
        description: 'Only admins can merge clients.'
      });
      return;
    }

    setMergePending(true);
    setMergeError(null);

    try {
      await mergeClients(clientId, selectedDuplicate.id);
      toast({
        title: 'Merged successfully',
        description: `Orders and sites moved from ${selectedDuplicate.name}.`
      });
      setSelectedDuplicate(null);
      setMergeSearch('');
      setConfirmOpen(false);
      await refreshSummaryAndSites();
      navigate(`/clients/${clientId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to merge clients.';
      setMergeError(message);
      toast({
        title: 'Merge failed',
        description: message
      });
    } finally {
      setMergePending(false);
    }
  };

  if (!clientId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Missing client id in route.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Client Profile</div>
          <div className="text-xl font-semibold">{summary?.client_name ?? clientId}</div>
          <div className="text-xs text-muted-foreground">Client ID: {clientId}</div>
        </div>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          Back to Clients
        </Button>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failed to load client</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-500">{error}</CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Orders</CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div>Total Orders: {ordersTotal.toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1 || ordersLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <div>
                    Page {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages || ordersLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading || ordersLoading ? (
                <div className="text-sm text-muted-foreground">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead className="text-right">Tons</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={`${order.source}-${order.id}`}>
                          <TableCell>{order.date ?? '—'}</TableCell>
                          <TableCell>{order.site ?? '—'}</TableCell>
                          <TableCell>{order.status ?? '—'}</TableCell>
                          <TableCell>{order.order_type ?? '—'}</TableCell>
                          <TableCell>{order.shift ?? '—'}</TableCell>
                          <TableCell className="text-right">{formatTons(order.tons)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Client Overview</CardTitle>
                <EditClientDialog
                  client={summary}
                  canEdit={canEdit}
                  onUpdated={(updated) => setSummary(updated)}
                />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Client Name</div>
                    <div className="text-sm font-semibold">{summary?.client_name ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Client ID</div>
                    <div className="text-sm font-semibold">{clientId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Orders</div>
                    <div className="text-sm font-semibold">{loading ? '—' : topStats.totalOrders.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Tons</div>
                    <div className="text-sm font-semibold">{loading ? '—' : formatTons(topStats.totalTons)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sites</div>
                    <div className="text-sm font-semibold">{loading ? '—' : topStats.uniqueSites.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Last Order</div>
                    <div className="text-sm font-semibold">{loading ? '—' : topStats.lastDate ?? '—'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Sites Performance</CardTitle>
                <MergeSitesDialog
                  clientId={clientId}
                  sites={sites}
                  canMerge={canMerge}
                  onMerged={refreshSummaryAndSites}
                />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading sites...</div>
                ) : sites.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No sites found for this client.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Site</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Tons</TableHead>
                          <TableHead>Last Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sites.map((site) => (
                          <TableRow
                            key={site.site_id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/clients/${clientId}/sites/${site.site_id}`)}
                          >
                            <TableCell>
                              <div className="font-medium">{site.site_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {site.contact_name ?? 'No contact'} • {site.location_text ?? 'No location'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{site.total_orders.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatTons(site.total_tons)}</TableCell>
                            <TableCell>{site.last_order_date ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Contact Name</span>
                  <span className="font-medium text-foreground">{summary?.contact_name ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Contact Phone</span>
                  <span className="font-medium text-foreground">{summary?.contact_phone ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Contact Email</span>
                  <span className="font-medium text-foreground">{summary?.contact_email ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-foreground">{summary?.address ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-foreground">{summary?.notes ?? '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Tons</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {analyticsLoading || loading ? (
                  <div className="text-sm text-muted-foreground">Loading analytics...</div>
                ) : monthlyTons.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No monthly data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTons} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tons" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {!analytics && !analyticsLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <p>{analyticsError ?? 'Analytics data is unavailable for this client.'}</p>
                  <Button variant="outline" className="mt-4" onClick={handleRetryAnalytics}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusBreakdown.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No status breakdown available.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Tons</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statusBreakdown.map((row) => (
                              <TableRow key={row.label}>
                                <TableCell>{row.label}</TableCell>
                                <TableCell className="text-right">{row.orders.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatTons(row.tons)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Type Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderTypeBreakdown.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No order type breakdown available.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order Type</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Tons</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderTypeBreakdown.map((row) => (
                              <TableRow key={row.label}>
                                <TableCell>{row.label}</TableCell>
                                <TableCell className="text-right">{row.orders.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatTons(row.tons)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shift Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {shiftBreakdown.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No shift breakdown available.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Shift</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Tons</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shiftBreakdown.map((row) => (
                              <TableRow key={row.label}>
                                <TableCell>{row.label}</TableCell>
                                <TableCell className="text-right">{row.orders.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatTons(row.tons)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Diameter Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {diameterBreakdown.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No diameter breakdown available.</div>
                    ) : (
                      <>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={diameterDetails}
                                dataKey="tons"
                                nameKey="label"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={2}
                              >
                                {diameterDetails.map((entry, index) => (
                                  <Cell key={`cell-${entry.label}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatTons(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Diameter</TableHead>
                                <TableHead className="text-right">Tons</TableHead>
                                <TableHead className="text-right">Share</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {diameterDetails.map((row) => (
                                <TableRow key={row.label}>
                                  <TableCell>{row.label}</TableCell>
                                  <TableCell className="text-right">{formatTons(row.tons)}</TableCell>
                                  <TableCell className="text-right">{row.percentage}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {Math.abs(diameterTotal - topStats.totalTons) > 0.1 && topStats.totalTons > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Breakdown total differs from total tons by {formatNumber(Math.abs(diameterTotal - topStats.totalTons))} t.
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ClientProfilePage;
