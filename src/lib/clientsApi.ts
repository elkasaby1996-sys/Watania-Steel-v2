import { supabase } from '@/lib/supabase';

type RpcOptions = {
  signal?: AbortSignal;
  retries?: number;
};

const isAbortError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as any).name) : '';
  const message = 'message' in err ? String((err as any).message) : '';
  return name === 'AbortError' || message.toLowerCase().includes('abort');
};

async function rpcWithRetry<T>(
  fnName: string,
  args: Record<string, any>,
  opts: RpcOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 1;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let q = supabase.rpc(fnName as any, args as any);
      if (opts.signal) q = (q as any).abortSignal(opts.signal);

      const { data, error } = await q;
      if (error) throw error;

      return data as T;
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastErr = err;
      if (attempt === retries) break;
      // small backoff
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(`RPC failed: ${fnName}`);
}

/** ---------- Types ---------- */

export type ClientSummaryRow = {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null; // date
};

export type ClientTopSummary = {
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null; // date
};

export type ClientSitePerformanceRow = {
  site_id: string;
  site_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null; // date
};

export type ClientSiteDetails = {
  site_id: string;
  site_name: string;
  client_id: string;
  client_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null; // date
};

export type ClientOrderRow = {
  id: string;
  date: string | null; // date
  status: string | null;
  tons: number | null;
  company: string | null;
  site: string | null;
  order_type: string | null;
  shift: string | null;
  delivered_at: string | null; // timestamptz
  signed_delivery_note: boolean | null;
  delivery_number: string | null;
  driver_name: string | null;
  phone_number: string | null;
  customer_name: string | null;
  source: string; // 'orders' | 'history_orders'
  total_count: number; // window count
};

export type ClientOrdersPageResult = {
  rows: ClientOrderRow[];
  totalCount: number;
};

export type ClientAnalytics = any; // keep flexible because RPC returns jsonb

/** ---------- API functions ---------- */

export async function fetchClientsSummary(searchText?: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSummaryRow[]>(
    'get_clients_summary',
    { search_text: searchText ?? null },
    { signal, retries: 1 }
  );
  return data ?? [];
}

export async function fetchClientSummary(clientId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientTopSummary[]>(
    'get_client_summary',
    { client_id: clientId },
    { signal, retries: 1 }
  );
  return data?.[0] ?? null;
}

export async function fetchClientSitesPerformance(clientId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSitePerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal, retries: 1 }
  );
  return data ?? [];
}

export async function fetchClientSiteSummary(clientId: string, siteId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSiteDetails[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal, retries: 1 }
  );
  return data?.[0] ?? null;
}

export async function fetchClientOrdersPage(
  clientId: string,
  limit = 50,
  offset = 0,
  signal?: AbortSignal
): Promise<ClientOrdersPageResult> {
  const data = await rpcWithRetry<ClientOrderRow[]>(
    'get_client_orders_page',
    { client_id: clientId, limit_count: limit, offset_count: offset },
    { signal, retries: 1 }
  );

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
  return { rows, totalCount };
}

export async function fetchClientAnalytics(clientId: string, signal?: AbortSignal) {
  // This RPC returns jsonb (not an array)
  const data = await rpcWithRetry<ClientAnalytics>(
    'get_client_analytics',
    { client_id: clientId },
    { signal, retries: 1 }
  );
  return data ?? null;
}

/**
 * Optional convenience object (so imports like `clientsApi.fetchClientSummary` also work)
 */
export const clientsApi = {
  fetchClientsSummary,
  fetchClientSummary,
  fetchClientSitesPerformance,
  fetchClientSiteSummary,
  fetchClientOrdersPage,
  fetchClientAnalytics
};
