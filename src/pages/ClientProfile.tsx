import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  fetchClientAnalytics,
  fetchClientOrdersPage,
  fetchClientSitesPerformance,
  fetchClientSummary,
  type ClientOrderRow,
  type ClientSitePerformanceRow,
  type ClientTopSummary
} from '@/lib/clientsApi';

const isAbortError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as any).name) : '';
  const message = 'message' in err ? String((err as any).message) : '';
  return name === 'AbortError' || message.toLowerCase().includes('abort');
};

const formatTons = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function ClientProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ClientTopSummary | null>(null);
  const [sites, setSites] = useState<ClientSitePerformanceRow[]>([]);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [analytics, setAnalytics] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const abortSignal = controller.signal;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // reset page on client change
        setPage(1);

        const [s, sp, op, an] = await Promise.all([
          fetchClientSummary(clientId, abortSignal),
          fetchClientSitesPerformance(clientId, abortSignal),
          fetchClientOrdersPage(clientId, pageSize, 0, abortSignal),
          fetchClientAnalytics(clientId, abortSignal)
        ]);

        setSummary(s);
        setSites(sp);
        setOrders(op.rows);
        setOrdersTotal(op.totalCount);
        setAnalytics(an);
      } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : 'Failed to load client profile';
        setError(msg);
      } finally {
        if (!abortSignal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const abortSignal = controller.signal;

    (async () => {
      try {
        const offset = (page - 1) * pageSize;
        const op = await fetchClientOrdersPage(clientId, pageSize, offset, abortSignal);
        setOrders(op.rows);
        setOrdersTotal(op.totalCount);
      } catch (err) {
        if (isAbortError(err)) return;
        // don’t hard-fail the whole page for paging errors
        console.error(err);
      }
    })();

    return () => controller.abort();
  }, [clientId, page]);

  const totalPages = useMemo(() => {
    if (!ordersTotal) return 1;
    return Math.max(1, Math.ceil(ordersTotal / pageSize));
  }, [ordersTotal]);

  const topStats = useMemo(() => {
    const totalTons = summary?.total_tons ?? 0;
    const totalOrders = summary?.total_orders ?? 0;
    const uniqueSites = summary?.unique_sites ?? 0;
    const lastDate = summary?.last_order_date ?? null;
    return { totalTons, totalOrders, uniqueSites, lastDate };
  }, [summary]);

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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Client Profile</div>
          <div className="text-xl font-semibold">{clientId}</div>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Tons</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? '—' : `${formatTons(topStats.totalTons)} t`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? '—' : topStats.totalOrders}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sites</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? '—' : topStats.uniqueSites}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last Order</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? '—' : topStats.lastDate ?? '—'}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : sites.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sites found for this client.</div>
          ) : (
            <div className="divide-y divide-border rounded-md border">
              {sites.map((s) => (
                <button
                  key={s.site_id}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => navigate(`/clients/${clientId}/sites/${s.site_id}`)}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.site_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.location_text ?? 'No location'} • {s.contact_phone ?? 'No phone'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold">{formatTons(Number(s.total_tons ?? 0))} t</div>
                    <div className="text-xs text-muted-foreground">{s.total_orders} orders</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Orders</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="text-sm text-muted-foreground">No orders found.</div>
          ) : (
            <div className="divide-y divide-border rounded-md border">
              {orders.map((o) => (
                <div key={`${o.source}-${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {o.company ?? '—'} • {o.site ?? '—'}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.date ?? '—'} • {o.order_type ?? '—'} • {o.shift ?? '—'} • {o.status ?? '—'} • {o.source}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">{formatTons(Number(o.tons ?? 0))} t</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : !analytics ? (
            <div className="text-sm text-muted-foreground">No analytics available.</div>
          ) : (
            <pre className="max-h-[320px] overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(analytics, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Optional default export, in case somewhere imports default:
export default ClientProfilePage;
