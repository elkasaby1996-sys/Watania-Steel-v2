// src/pages/ClientProfile.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { MergeClientsDialog } from '@/components/MergeClientsDialog';
import { MergeSitesDialog } from '@/components/MergeSitesDialog';
import { useIsAdmin } from '@/hooks/useIsAdmin';

// ✅ IMPORTANT: these must exist in src/lib/clientsApi.ts
import {
  fetchClientsSummary,
  fetchClientSummary,
  fetchClientSitesPerformance,
  fetchClientOrdersPage,
  fetchClientAnalytics,
  type ClientOrdersPageParams,
  type ClientSummary
} from '../lib/clientsApi';

type ClientOverviewSummary = {
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
};

type SitePerformanceRow = {
  site_id: string;
  site_name: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  location_text?: string | null;
  google_maps_url?: string | null;
  notes?: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
};

type ClientOrderRow = {
  id: string; // note: your RPC returns id text (sometimes "2601105/2601104")
  date: string | null;
  status: string | null;
  tons: number | null;
  company: string | null;
  site: string | null;
  order_type: string | null;
  shift: string | null;
  delivered_at: string | null;
  signed_delivery_note: boolean | null;
  delivery_number: string | null;
  driver_name: string | null;
  phone_number: string | null;
  customer_name: string | null;
  source: string | null; // 'orders' or 'history_orders'
  total_count: number; // window count returned by RPC
};

function formatNumber(n: number | null | undefined, digits = 3) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0.000';
  return Number(n).toFixed(digits);
}

function safeDate(d: string | null | undefined) {
  if (!d) return 'N/A';
  return d;
}

type AnalyticsRow = {
  label: string;
  tons: number;
};

type AnalyticsSectionProps = {
  analytics: any;
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeBreakdown = (data: unknown, labelKey: string, valueKey: string): AnalyticsRow[] => {
  if (!Array.isArray(data)) return [];
  return data.map((entry) => ({
    label: String((entry as Record<string, unknown>)[labelKey] ?? 'Unknown'),
    tons: toNumber((entry as Record<string, unknown>)[valueKey])
  })).filter((row) => row.tons > 0);
};

const getAnalyticsList = (analytics: any, keys: string[], labelKey: string, valueKey: string) => {
  for (const key of keys) {
    const list = normalizeBreakdown(analytics?.[key], labelKey, valueKey);
    if (list.length > 0) return list;
  }
  return [];
};

const getMonthlyTons = (analytics: any) => {
  const candidates = analytics?.monthly_tons ?? analytics?.monthlyTons ?? analytics?.time_series ?? analytics?.timeSeries;
  if (!Array.isArray(candidates)) return [];
  return candidates.map((entry) => ({
    label: String((entry as Record<string, unknown>).month ?? (entry as Record<string, unknown>).date ?? 'N/A'),
    tons: toNumber((entry as Record<string, unknown>).tons)
  })).filter((row) => row.tons > 0);
};

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '12px'
};

function AnalyticsSection({ analytics }: AnalyticsSectionProps) {
  const monthlyTons = useMemo(() => getMonthlyTons(analytics), [analytics]);
  const statusBreakdown = useMemo(
    () => getAnalyticsList(analytics, ['status_breakdown', 'statusBreakdown'], 'status', 'tons'),
    [analytics]
  );
  const typeBreakdown = useMemo(
    () => getAnalyticsList(analytics, ['order_type_breakdown', 'orderTypeBreakdown'], 'order_type', 'tons'),
    [analytics]
  );
  const shiftBreakdown = useMemo(
    () => getAnalyticsList(analytics, ['shift_breakdown', 'shiftBreakdown'], 'shift', 'tons'),
    [analytics]
  );
  const diameterBreakdown = useMemo(
    () => getAnalyticsList(analytics, ['diameter_breakdown', 'diameterBreakdown', 'diameter_totals'], 'diameter', 'tons'),
    [analytics]
  );

  if (
    monthlyTons.length === 0 &&
    statusBreakdown.length === 0 &&
    typeBreakdown.length === 0 &&
    shiftBreakdown.length === 0 &&
    diameterBreakdown.length === 0
  ) {
    return <div className="text-slate-400 text-sm">No analytics data available for this client.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 p-4">
        <div className="font-semibold mb-3">Monthly Tons</div>
        {monthlyTons.length === 0 ? (
          <div className="text-slate-400 text-sm">No monthly data available.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTons}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="tons" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownTable title="Status Breakdown" rows={statusBreakdown} />
        <BreakdownTable title="Order Type Breakdown" rows={typeBreakdown} />
        <BreakdownTable title="Shift Breakdown" rows={shiftBreakdown} />
      </div>

      <div className="rounded-lg border border-slate-800 p-4">
        <div className="font-semibold mb-3">Diameter Breakdown</div>
        {diameterBreakdown.length === 0 ? (
          <div className="text-slate-400 text-sm">No diameter data available.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diameterBreakdown}
                    dataKey="tons"
                    nameKey="label"
                    innerRadius="50%"
                    outerRadius="80%"
                    fill="#38bdf8"
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <BreakdownTable title="" rows={diameterBreakdown} />
          </div>
        )}
      </div>
    </div>
  );
}

type BreakdownTableProps = {
  title: string;
  rows: AnalyticsRow[];
};

function BreakdownTable({ title, rows }: BreakdownTableProps) {
  return (
    <div className="rounded-lg border border-slate-800 p-4">
      {title && <div className="font-semibold mb-3">{title}</div>}
      {rows.length === 0 ? (
        <div className="text-slate-400 text-sm">No data available.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Label</th>
              <th className="text-right py-2">Tons</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-800/60">
                <td className="py-2">{row.label}</td>
                <td className="py-2 text-right">{formatNumber(row.tons)} t</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ClientProfilePage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const PAGE_SIZE = 50;

  const [activeTab, setActiveTab] = useState<'orders' | 'overview' | 'analytics'>('orders');

  const [summary, setSummary] = useState<ClientOverviewSummary | null>(null);
  const [sites, setSites] = useState<SitePerformanceRow[]>([]);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotalCount, setOrdersTotalCount] = useState<number>(0);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [analyticsJson, setAnalyticsJson] = useState<any>(null);
  const [mergeClientsList, setMergeClientsList] = useState<ClientSummary[]>([]);
  const [mergeClientsLoading, setMergeClientsLoading] = useState(false);
  const [mergeClientsError, setMergeClientsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin } = useIsAdmin();

  // pagination
  const [ordersPage, setOrdersPage] = useState(1);

  // abort controllers
  const summaryAbortRef = useRef<AbortController | null>(null);
  const ordersAbortRef = useRef<AbortController | null>(null);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((ordersTotalCount || 0) / PAGE_SIZE));
  }, [PAGE_SIZE, ordersTotalCount]);

  useEffect(() => {
    if (!clientId) return;

    // abort previous summary loads
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;
    const signal = controller.signal;

    // reset state
    setSummary(null);
    setSites([]);
    setOrders([]);
    setOrdersTotalCount(0);
    setAnalyticsJson(null);

    setSummaryError(null);
    setSitesError(null);
    setOrdersError(null);
    setAnalyticsError(null);

    setOrdersPage(1);

    // load summary + sites + analytics
    (async () => {
      try {
        setLoadingSummary(true);
        setLoadingSites(true);
        setLoadingAnalytics(true);

        const [summaryRes, sitesRes, analyticsRes] = await Promise.all([
          fetchClientSummary(clientId, signal),
          fetchClientSitesPerformance(clientId, signal),
          fetchClientAnalytics(clientId, signal)
        ]);

        if (signal.aborted) return;

        setSummary(summaryRes);
        setSites(Array.isArray(sitesRes) ? sitesRes : []);
        setAnalyticsJson(analyticsRes ?? null);
      } catch (err: any) {
        if (signal.aborted) return;
        const msg = err?.message || 'Failed to load client profile';
        setSummaryError(msg);
        setSitesError(msg);
        setOrdersError(msg);
        setAnalyticsError(msg);
      } finally {
        if (!signal.aborted) {
          setLoadingSummary(false);
          setLoadingSites(false);
          setLoadingAnalytics(false);
        }
      }
    })();

    return () => controller.abort();
  }, [clientId, refreshKey]);

  useEffect(() => {
    if (!clientId) return;

    // load orders page on page change
    ordersAbortRef.current?.abort();
    const controller = new AbortController();
    ordersAbortRef.current = controller;
    const signal = controller.signal;

    (async () => {
      try {
        setLoadingOrders(true);
        setOrdersError(null);

        const params: ClientOrdersPageParams = {
          limit: PAGE_SIZE,
          offset: (ordersPage - 1) * PAGE_SIZE
        };
        const ordersRes = await fetchClientOrdersPage(clientId, params, signal);

        if (signal.aborted) return;

        const rows = Array.isArray(ordersRes?.rows) ? ordersRes.rows : [];
        setOrders(rows);
        setOrdersTotalCount(Number(rows[0]?.total_count ?? 0));
      } catch (err: any) {
        if (signal.aborted) return;
        setOrdersError(err?.message || 'Failed to load orders');
      } finally {
        if (!signal.aborted) setLoadingOrders(false);
      }
    })();

    return () => controller.abort();
  }, [clientId, ordersPage]);

  useEffect(() => {
    if (!isAdmin) return;

    let isActive = true;
    setMergeClientsLoading(true);
    setMergeClientsError(null);

    fetchClientsSummary()
      .then((data) => {
        if (!isActive) return;
        setMergeClientsList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!isActive) return;
        setMergeClientsError(err instanceof Error ? err.message : 'Failed to load clients list');
      })
      .finally(() => {
        if (isActive) setMergeClientsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isAdmin]);

  const handleClientsMerged = (primaryId: string, duplicateId: string) => {
    setRefreshKey((prev) => prev + 1);
    if (duplicateId === clientId) {
      navigate(`/clients/${primaryId}`);
    }
  };

  const handleSitesMerged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-red-400">Missing clientId in URL.</div>
        <button className="mt-4 px-3 py-2 rounded bg-slate-700" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">
            <Link to="/clients" className="hover:underline">
              ← Back to Clients
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Client profile and order history</h1>
          <div className="text-xs text-slate-400 mt-1">Client ID: {clientId}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <MergeClientsDialog
              clients={mergeClientsList}
              canMerge={isAdmin}
              defaultPrimaryId={clientId}
              loadingClients={mergeClientsLoading}
              loadError={mergeClientsError}
              onMerged={handleClientsMerged}
              triggerLabel="Merge Clients"
            />
          )}
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded ${activeTab === 'orders' ? 'bg-slate-700' : 'bg-slate-800'}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`px-3 py-2 rounded ${activeTab === 'overview' ? 'bg-slate-700' : 'bg-slate-800'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-3 py-2 rounded ${activeTab === 'analytics' ? 'bg-slate-700' : 'bg-slate-800'}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Total Orders</div>
          <div className="text-2xl font-semibold">
            {loadingSummary ? '…' : summary?.total_orders ?? 0}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Total Tons</div>
          <div className="text-2xl font-semibold">
            {loadingSummary ? '…' : `${formatNumber(summary?.total_tons ?? 0)} t`}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Sites</div>
          <div className="text-2xl font-semibold">
            {loadingSummary ? '…' : summary?.unique_sites ?? 0}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Last Order</div>
          <div className="text-2xl font-semibold">
            {loadingSummary ? '…' : safeDate(summary?.last_order_date)}
          </div>
        </div>
      </div>

      {(summaryError || sitesError || ordersError || analyticsError) && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-200 text-sm">
          {summaryError || sitesError || ordersError || analyticsError}
        </div>
      )}

      {/* Tabs */}
  {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
            <div className="font-semibold mb-3">Client Overview</div>
            <div className="text-sm text-slate-300 space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Orders</span>
                <span>{summary?.total_orders ?? 0}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Tons</span>
                <span>{formatNumber(summary?.total_tons ?? 0)} t</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Sites</span>
                <span>{summary?.unique_sites ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Order</span>
                <span>{safeDate(summary?.last_order_date)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="font-semibold">Sites Performance</div>
              <MergeSitesDialog
                clientId={clientId}
                sites={sites}
                canMerge={isAdmin}
                onMerged={handleSitesMerged}
              />
            </div>
            {loadingSites ? (
              <div className="text-slate-400 text-sm">Loading…</div>
            ) : sites.length === 0 ? (
              <div className="text-slate-400 text-sm">No sites found.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-2">Site</th>
                      <th className="text-right py-2">Orders</th>
                      <th className="text-right py-2">Tons</th>
                      <th className="text-right py-2">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr
                        key={s.site_id}
                        className="border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40"
                        onClick={() => navigate(`/clients/${clientId}/sites/${s.site_id}`)}
                      >
                        <td className="py-2">
                          <Link
                            className="hover:underline"
                            to={`/clients/${clientId}/sites/${s.site_id}`}
                          >
                            {s.site_name}
                          </Link>
                          {(s.contact_name || s.contact_phone || s.location_text) && (
                            <div className="text-xs text-slate-500 mt-1">
                              {s.contact_name ? `Contact: ${s.contact_name}` : ''}
                              {s.contact_phone ? ` • ${s.contact_phone}` : ''}
                              {s.location_text ? ` • ${s.location_text}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-right">{s.total_orders}</td>
                        <td className="py-2 text-right">{formatNumber(s.total_tons)} t</td>
                        <td className="py-2 text-right">{safeDate(s.last_order_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Order History</div>
            <div className="flex items-center gap-2 text-sm">
              <button
                className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
                onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
                disabled={ordersPage <= 1 || loadingOrders}
              >
                Prev
              </button>
              <div className="text-slate-400">
                Page {ordersPage} / {totalPages}
              </div>
              <button
                className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
                onClick={() => setOrdersPage((current) => Math.min(totalPages, current + 1))}
                disabled={ordersPage >= totalPages || loadingOrders}
              >
                Next
              </button>
            </div>
          </div>

          {ordersError && (
            <div className="text-sm text-red-300 mb-2">{ordersError}</div>
          )}
          {loadingOrders ? (
            <div className="text-slate-400 text-sm">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="text-slate-400 text-sm">No orders found.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Shift</th>
                    <th className="text-left py-2">Site</th>
                    <th className="text-right py-2">Tons</th>
                    <th className="text-left py-2">Driver</th>
                    <th className="text-left py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={`${o.source}-${o.id}-${o.date ?? ''}`} className="border-b border-slate-800/60">
                      <td className="py-2">{o.id}</td>
                      <td className="py-2">{safeDate(o.date)}</td>
                      <td className="py-2">{o.status ?? '—'}</td>
                      <td className="py-2">{o.order_type ?? '—'}</td>
                      <td className="py-2">{o.shift ?? '—'}</td>
                      <td className="py-2">{o.site ?? '—'}</td>
                      <td className="py-2 text-right">{formatNumber(o.tons)} t</td>
                      <td className="py-2">{o.driver_name ?? '—'}</td>
                      <td className="py-2">{o.source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
          <div className="font-semibold mb-3">Analytics</div>
          {loadingAnalytics ? (
            <div className="text-slate-400 text-sm">Loading…</div>
          ) : (
            <div className="space-y-6">
              {analyticsError && (
                <div className="text-sm text-red-300">{analyticsError}</div>
              )}
              {analyticsJson ? (
                <AnalyticsSection analytics={analyticsJson} />
              ) : (
                <div className="text-slate-400 text-sm">
                  No analytics data available for this client.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
