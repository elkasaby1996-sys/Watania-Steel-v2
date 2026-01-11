import { rpcWithRetry } from '@/lib/rpcWithRetry';
import { supabase } from '@/lib/supabase';

// Supabase returns numeric columns as string sometimes, so we normalize safely.
const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export interface ClientSummary {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientSummaryDetail {
  // Your RPC get_client_summary returns metrics.
  // RPC metrics only (client info loaded separately).
  id: string;

  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
}

export interface ClientOrderRow {
  id: string;
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
  source: 'orders' | 'history_orders';
  total_count: number;
}

export interface ClientOrdersPage {
  rows: ClientOrderRow[];
  totalCount: number;
}

export interface ClientSitesPerformanceRow {
  site_id: string;
  site_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
}

export interface ClientAnalytics {
  monthly_tons: { month: string; tons: number }[];
  status_breakdown: { status: string; count: number; percentage?: number }[];
  order_type_breakdown: { order_type: string; count: number; tons: number }[];
  shift_breakdown: { shift: string; count: number; tons: number }[];
  diameter_breakdown: { diameter: string; tons: number; percentage: number }[];
  diameter_totals: {
    total_breakdown_tons: number;
    total_order_tons: number;
    has_mismatch: boolean;
  };
}

export interface ClientSiteSummary {
  site_id: string;
  site_name: string;
  client_id: string;
  client_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
}

/**
 * 1) Clients list (search)
 */
export const fetchClientsSummary = async (
  searchText?: string,
  signal?: AbortSignal
): Promise<ClientSummary[]> => {
  const { data, error } = await rpcWithRetry<any[]>(
    'get_clients_summary',
    { search_text: searchText?.trim() || null },
    { signal }
  );

  if (error) throw error;

  const rows = (data || []) as any[];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    total_orders: Number(r.total_orders ?? 0),
    total_tons: toNumber(r.total_tons),
    unique_sites: Number(r.unique_sites ?? 0),
    last_order_date: r.last_order_date ? String(r.last_order_date) : null,
  }));
};

/**
 * 2) Client profile header metrics + client info from public.clients
 */
export const fetchClientSummary = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientSummaryDetail> => {
  // metrics from RPC
  const { data: metricsData, error: metricsError } = await rpcWithRetry<any[]>(
    'get_client_summary',
    { client_id: clientId },
    { signal }
  );
  if (metricsError) throw metricsError;

  const metricsRow = (metricsData || [])[0] as any | undefined;
  return {
    id: clientId,
    total_orders: Number(metricsRow?.total_orders ?? 0),
    total_tons: toNumber(metricsRow?.total_tons),
    unique_sites: Number(metricsRow?.unique_sites ?? 0),
    last_order_date: metricsRow?.last_order_date ? String(metricsRow.last_order_date) : null,
  };
};

/**
 * 2b) Client row details from public.clients
 */
export const fetchClientRow = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientRow | null> => {
  const q = supabase
    .from('clients')
    .select('id,name,contact_name,contact_phone,contact_email,address,notes')
    .eq('id', clientId)
    .limit(1);

  const { data, error } = await (signal ? q.abortSignal(signal) : q);
  if (error) throw error;
  const row = (data || [])[0];
  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    contact_name: row.contact_name ?? null,
    contact_phone: row.contact_phone ?? null,
    contact_email: row.contact_email ?? null,
    address: row.address ?? null,
    notes: row.notes ?? null,
  };
};

/**
 * 3) Client orders table (paged) from RPC (unified orders + history_orders)
 */
export const fetchClientOrdersPage = async (
  clientId: string,
  limit = 50,
  offset = 0,
  signal?: AbortSignal
): Promise<ClientOrdersPage> => {
  const { data, error } = await rpcWithRetry<any[]>(
    'get_client_orders_page',
    {
      client_id: clientId,
      limit_count: limit,
      offset_count: offset,
    },
    { signal }
  );
  if (error) throw error;

  const rows = (data || []) as any[];
  const totalCount = rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0;

  return {
    rows: rows.map((r) => ({
      id: String(r.id),
      date: r.date ? String(r.date) : null,
      status: r.status ? String(r.status) : null,
      tons: r.tons === null || r.tons === undefined ? null : toNumber(r.tons),
      company: r.company ? String(r.company) : null,
      site: r.site ? String(r.site) : null,
      order_type: r.order_type ? String(r.order_type) : null,
      shift: r.shift ? String(r.shift) : null,
      delivered_at: r.delivered_at ? String(r.delivered_at) : null,
      signed_delivery_note: r.signed_delivery_note ?? null,
      delivery_number: r.delivery_number ? String(r.delivery_number) : null,
      driver_name: r.driver_name ? String(r.driver_name) : null,
      phone_number: r.phone_number ? String(r.phone_number) : null,
      customer_name: r.customer_name ? String(r.customer_name) : null,
      source: (r.source === 'orders' ? 'orders' : 'history_orders') as 'orders' | 'history_orders',
      total_count: Number(r.total_count ?? totalCount),
    })),
    totalCount,
  };
};

/**
 * 4) Sites performance list (tons only) from RPC
 */
export const fetchClientSitesPerformance = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientSitesPerformanceRow[]> => {
  const { data, error } = await rpcWithRetry<any[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal }
  );
  if (error) throw error;

  const rows = (data || []) as any[];
  return rows.map((r) => ({
    site_id: String(r.site_id),
    site_name: String(r.site_name ?? ''),
    contact_name: r.contact_name ?? null,
    contact_phone: r.contact_phone ?? null,
    contact_email: r.contact_email ?? null,
    address: r.address ?? null,
    location_text: r.location_text ?? null,
    google_maps_url: r.google_maps_url ?? null,
    notes: r.notes ?? null,
    total_orders: Number(r.total_orders ?? 0),
    total_tons: toNumber(r.total_tons),
    last_order_date: r.last_order_date ? String(r.last_order_date) : null,
  }));
};

/**
 * 5) Single site details (click a site -> show profile)
 */
export const fetchClientSiteSummary = async (
  clientId: string,
  siteId: string,
  signal?: AbortSignal
): Promise<ClientSiteSummary> => {
  const { data, error } = await rpcWithRetry<any[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal }
  );
  if (error) throw error;

  const row = (data || [])[0] as any | undefined;
  if (!row) throw new Error('Unable to load site details');

  return {
    site_id: String(row.site_id),
    site_name: String(row.site_name ?? ''),
    client_id: String(row.client_id),
    client_name: String(row.client_name ?? ''),
    contact_name: row.contact_name ?? null,
    contact_phone: row.contact_phone ?? null,
    contact_email: row.contact_email ?? null,
    address: row.address ?? null,
    location_text: row.location_text ?? null,
    google_maps_url: row.google_maps_url ?? null,
    notes: row.notes ?? null,
    total_orders: Number(row.total_orders ?? 0),
    total_tons: toNumber(row.total_tons),
    last_order_date: row.last_order_date ? String(row.last_order_date) : null,
  };
};

/**
 * 6) Client analytics (tons-based)
 */
export const fetchClientAnalytics = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientAnalytics> => {
  const { data, error } = await rpcWithRetry<any[]>(
    'get_client_analytics',
    { client_id: clientId },
    { signal }
  );
  if (error) throw error;
  const analyticsRow = (data || [])[0] as any | undefined;
  if (!analyticsRow) throw new Error('Unable to load analytics');

  // normalize numeric fields inside JSON
  const normalized: ClientAnalytics = {
    monthly_tons: (analyticsRow.monthly_tons || []).map((x: any) => ({
      month: String(x.month),
      tons: toNumber(x.tons),
    })),
    status_breakdown: (analyticsRow.status_breakdown || []).map((x: any) => ({
      status: String(x.status),
      count: Number(x.count ?? 0),
      percentage: x.percentage !== undefined ? toNumber(x.percentage) : undefined,
    })),
    order_type_breakdown: (analyticsRow.order_type_breakdown || []).map((x: any) => ({
      order_type: String(x.order_type),
      count: Number(x.count ?? 0),
      tons: toNumber(x.tons),
    })),
    shift_breakdown: (analyticsRow.shift_breakdown || []).map((x: any) => ({
      shift: String(x.shift),
      count: Number(x.count ?? 0),
      tons: toNumber(x.tons),
    })),
    diameter_breakdown: (analyticsRow.diameter_breakdown || []).map((x: any) => ({
      diameter: String(x.diameter),
      tons: toNumber(x.tons),
      percentage: toNumber(x.percentage),
    })),
    diameter_totals: {
      total_breakdown_tons: toNumber(analyticsRow?.diameter_totals?.total_breakdown_tons),
      total_order_tons: toNumber(analyticsRow?.diameter_totals?.total_order_tons),
      has_mismatch: Boolean(analyticsRow?.diameter_totals?.has_mismatch),
    },
  };

  return normalized;
};

