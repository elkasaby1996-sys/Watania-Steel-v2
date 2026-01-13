import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditSiteDialog } from '@/components/EditSiteDialog';
import { formatNumber } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  fetchClientSiteOrdersPage,
  fetchClientSiteSummary,
  type ClientOrderRow,
  type ClientSiteDetails
} from '@/lib/clientsApi';

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

  const [siteSummary, setSiteSummary] = useState<ClientSiteDetails | null>(null);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const formatTons = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${formatNumber(value)} t`;
  };

  useEffect(() => {
    if (!clientId || !siteId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    const loadSite = async () => {
      try {
        const [summaryResult, ordersResult] = await Promise.all([
          fetchClientSiteSummary(clientId, siteId, signal),
          fetchClientSiteOrdersPage(clientId, siteId, 1, pageSize, signal)
        ]);
        if (signal.aborted) return;
        setSiteSummary(summaryResult);
        setOrders(ordersResult.rows);
        setOrdersTotal(ordersResult.totalCount);
        setPage(1);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load site details');
        setSiteSummary(null);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSite();

    return () => controller.abort();
  }, [clientId, pageSize, siteId]);

  useEffect(() => {
    if (!clientId || !siteId) return;
    if (page === 1) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const pageData = await fetchClientSiteOrdersPage(clientId, siteId, page, pageSize, signal);
        if (signal.aborted) return;
        setOrders(pageData.rows);
        setOrdersTotal(pageData.totalCount);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error(err);
        }
      } finally {
        if (!signal.aborted) setOrdersLoading(false);
      }
    };

    loadOrders();

    return () => controller.abort();
  }, [clientId, page, pageSize, siteId]);

  const totalPages = useMemo(() => {
    if (!ordersTotal) return 1;
    return Math.max(1, Math.ceil(ordersTotal / pageSize));
  }, [ordersTotal, pageSize]);

  const handleSiteUpdated = (updated: ClientSiteDetails) => {
    setSiteSummary(updated);
  };

  const contactRows = useMemo(() => (
    [
      { label: 'Contact Name', value: siteSummary?.contact_name },
      { label: 'Contact Phone', value: siteSummary?.contact_phone },
      { label: 'Location Text', value: siteSummary?.location_text },
      { label: 'Google Maps URL', value: siteSummary?.google_maps_url }
    ]
  ), [siteSummary]);

  if (!clientId || !siteId) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/clients')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Missing client or site information.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
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
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {siteSummary?.site_name || 'Site Details'}
          </h1>
          <p className="text-muted-foreground">Site profile and delivery metrics</p>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading site details...</CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {siteSummary && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{siteSummary.total_orders.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{formatNumber(siteSummary.total_tons)}</p>
                  <p className="text-xs text-muted-foreground">Total Tons</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{siteSummary.last_order_date || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Last Order</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Site Details
                </CardTitle>
                <CardDescription>Contact and location information</CardDescription>
              </div>
              <EditSiteDialog site={siteSummary} canEdit={isAdmin} onUpdated={handleSiteUpdated} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {contactRows.map((row) => (
                  <div key={row.label} className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-foreground">{row.value || '—'}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-foreground">{siteSummary.notes || '—'}</span>
                </div>
                {siteSummary.google_maps_url && (
                  <Button asChild variant="outline">
                    <a href={siteSummary.google_maps_url} target="_blank" rel="noreferrer">
                      Open in Maps
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Site Orders</CardTitle>
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
              {ordersLoading || loading ? (
                <div className="text-sm text-muted-foreground">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-sm text-muted-foreground">No orders found for this site.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
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
        </div>
      )}
    </div>
  );
}
