import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  fetchClientAnalytics,
  fetchClientOrdersPage,
  fetchClientSitesPerformance,
  fetchClientSummary,
  type ClientAnalytics,
  type ClientOrdersPage,
  type ClientSitePerformanceRow,
  type ClientSummary
} from '@/lib/clientsApi';

const isAbortError = (err: unknown) => {
  if (!err) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (typeof err === 'object' && 'name' in err && String((err as any).name) === 'AbortError') return true;
  if (typeof err === 'object' && 'message' in err && String((err as any).message).includes('AbortError')) return true;
  return false;
};

const fmtTons = (v: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v);

export default function ClientProfile() {
  const navigate = useNavigate();
  const params = useParams();
  const clientId = params.clientId as string | undefined;

  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [sites, setSites] = useState<ClientSitePerformanceRow[]>([]);
  const [ordersPage, setOrdersPage] = useState<ClientOrdersPage | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Load the main client profile data
  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const abortSignal = controller.signal;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // reset paging when switching clients
        setPage(1);

        const [summaryRes, sitesRes, ordersRes, analyticsRes] = await Promise.all([
          fetchClientSummary(clientId, abortSignal),
          fetchClientSitesPerformance(clientId, abortSignal),
          fetchClientOrdersPage(clientId, pageSize, 0, abortSignal),
          fetchClientAnalytics(clientId, abortSignal)
        ]);

        setSummary(summaryRes);
        setSites(sitesRes);
        setOrdersPage(ordersRes);
        setAnalytics(analyticsRes);
      } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : 'Failed to load client profile';
        setError(msg);
      } finally {
        if (!abortSignal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Load orders when page changes
  useEffect(() => {
    if (!clientId) return;
    if (page === 1) return; // already loaded in main effect

    const controller = new AbortController();
    const abortSignal = controller.signal;

    (async () => {
      try {
        const offset = (page - 1) * pageSize;
        const res = await fetchClientOrdersPage(clientId, pageSize, offset, abortSignal);
        setOrdersPage(res);
      } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : 'Failed to load client orders';
        setError(msg);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, page]);

  const totalOrders = ordersPage?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

  const topSites = useMemo(() => {
    const sorted = [...sites].sort((a, b) => (b.total_tons ?? 0) - (a.total_tons ?? 0));
    return sorted.slice(0, 8);
  }, [sites]);

  if (!clientId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Client not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Client Profile</h1>
          <p className="text-xs text-muted-foreground break-all">ID: {clientId}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          Back
        </Button>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Failed to load</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Top summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Total tons</div>
                <div className="text-2xl font-semibold">{fmtTons(summary?.total_tons ?? 0)} t</div>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Total orders</div>
                <div className="text-2xl font-semibold">{summary?.total_orders ?? 0}</div>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Sites</div>
                <div className="text-2xl font-semibold">{summary?.unique_sites ?? 0}</div>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Last order date</div>
                <div className="text-2xl font-semibold">{summary?.last_order_date ?? '—'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sites performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 rounded bg-muted/40 animate-pulse" />
          ) : sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sites found for this client.</p>
          ) : (
            <div className="space-y-3">
              {topSites.map((s) => (
                <button
                  key={s.site_id}
                  type="button"
                  className="w-full rounded-lg border bg-background p-4 text-left hover:bg-muted/20 transition"
                  onClick={() => navigate(`/clients/${clientId}/sites/${s.site_id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{s.site_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.contact_name ? `${s.contact_name}` : 'No contact'}
                        {s.contact_phone ? ` • ${s.contact_phone}` : ''}
                        {s.location_text ? ` • ${s.location_text}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{fmtTons(s.total_tons ?? 0)} t</div>
                      <div className="text-xs text-muted-foreground">{s.total_orders ?? 0} orders</div>
                    </div>
                  </div>
                </button>
              ))}
              {sites.length > topSites.length ? (
                <p className="text-xs text-muted-foreground">
                  Showing top {topSites.length} sites by tons. (Total sites: {sites.length})
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 rounded bg-muted/40 animate-pulse" />
          ) : !ordersPage || ordersPage.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-4">Site</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Tons</div>
                </div>
                {ordersPage.rows.map((o) => (
                  <div key={`${o.source}-${o.id}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t">
                    <div className="col-span-2">{o.date ?? '—'}</div>
                    <div className="col-span-4">{o.site ?? o.company ?? '—'}</div>
                    <div className="col-span-2">{o.order_type ?? '—'}</div>
                    <div className="col-span-2">{o.status ?? '—'}</div>
                    <div className="col-span-2 text-right">{o.tons == null ? '—' : `${fmtTons(o.tons)} t`}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} • Total orders: {totalOrders}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics (optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 rounded bg-muted/40 animate-pulse" />
          ) : !analytics ? (
            <p className="text-sm text-muted-foreground">No analytics returned.</p>
          ) : (
            <pre className="text-xs whitespace-pre-wrap break-words rounded-lg bg-muted/20 p-4">
              {JSON.stringify(analytics, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
