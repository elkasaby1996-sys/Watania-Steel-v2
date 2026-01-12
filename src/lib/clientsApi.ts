import { supabase } from '@/lib/supabase';

type RpcOptions = {
  signal?: AbortSignal;
};

const isAbortError = (err: unknown) => {
  if (!err) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (typeof err === 'object' && 'name' in err && String((err as any).name) === 'AbortError') return true;
  if (typeof err === 'object' && 'message' in err && String((err as any).message).includes('AbortError')) return true;
  return false;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Safe RPC wrapper:
 * - optional AbortSignal support
 * - light retry for transient issues
 * - does NOT retry aborts
 */
export async function rpcWithRetry<T>(
  fnName: string,
  args: Record<string, any>,
  options?: RpcOptions & { retries?: number; retryDelayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 1;
  const retryDelayMs = options?.retryDelayMs ?? 250;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Supabase JS supports passing { signal } in the options argument for rpc in v2
      // If your supabase client doesn't, remove the 3rd param and instead use abort via fetch wrapper.
      const { data, error } = await (supabase as any).rpc(fnName, args, options?.signal ? { signal: options.signal } : undefined);

      if (error) throw error;
      return data as T;
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastError = err;

      // retry only if we still have attempts left
      if (attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      throw lastError;
    }
  }

  // should never reach here
  throw lastError;
}

/** -----------------------------
 * Types matching your RPCs
 * ------------------------------ */

export type ClientSummaryRow = {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
};

export type ClientSummary = {
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
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
  last_order_date: string | null;
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
  last_order_date: string | null;
};

export type ClientOrderRow = {
  id: string; // your RPC returns TEXT id (because orders/history_orders ids are text-like)
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
  source: 'orders' | 'history_orders' | string;
  total_count: number; // window count
};

export type ClientOrdersPage = {
  rows: ClientOrderRow[];
  total_count: number;
};

export type ClientAnalytics = any; // jsonb returned by get_client_analytics

/** -----------------------------
 * API functions (tons-only)
 * ------------------------------ */

export async function fetchClientsSummary(searchText?: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSummaryRow[]>(
    'get_clients_summary',
    { search_text: searchText ?? null },
    { signal, retries: 1 }
  );

  // Ensure numbers are numbers (RPC may return numeric as string)
  return (data ?? []).map((r) => ({
    ...r,
    total_orders: Number(r.total_orders ?? 0),
    total_tons: Number((r as any).total_tons ?? 0),
    unique_sites: Number(r.unique_sites ?? 0)
  }));
}

export async function fetchClientSummary(clientId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSummary[]>(
    'get_client_summary',
    { client_id: clientId },
    { signal, retries: 1 }
  );

  const row = (data ?? [])[0];
  if (!row) {
    return {
      total_orders: 0,
      total_tons: 0,
      unique_sites: 0,
      last_order_date: null
    } satisfies ClientSummary;
  }

  return {
    total_orders: Number(row.total_orders ?? 0),
    total_tons: Number((row as any).total_tons ?? 0),
    unique_sites: Number(row.unique_sites ?? 0),
    last_order_date: row.last_order_date ?? null
  } satisfies ClientSummary;
}

export async function fetchClientSitesPerformance(clientId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSitePerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal, retries: 1 }
  );

  return (data ?? []).map((r) => ({
    ...r,
    total_orders: Number(r.total_orders ?? 0),
    total_tons: Number((r as any).total_tons ?? 0)
  }));
}

export async function fetchClientSiteSummary(clientId: string, siteId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSiteDetails[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal, retries: 1 }
  );

  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    ...row,
    total_orders: Number(row.total_orders ?? 0),
    total_tons: Number((row as any).total_tons ?? 0)
  } satisfies ClientSiteDetails;
}

export async function fetchClientOrdersPage(
  clientId: string,
  limitCount = 50,
  offsetCount = 0,
  signal?: AbortSignal
): Promise<ClientOrdersPage> {
  const data = await rpcWithRetry<ClientOrderRow[]>(
    'get_client_orders_page',
    { client_id: clientId, limit_count: limitCount, offset_count: offsetCount },
    { signal, retries: 1 }
  );

  const rows = (data ?? []).map((r) => ({
    ...r,
    tons: r.tons == null ? null : Number((r as any).tons),
    total_count: Number((r as any).total_count ?? 0)
  }));

  const total_count = rows[0]?.total_count ?? 0;
  return { rows, total_count };
}

export async function fetchClientAnalytics(clientId: string, signal?: AbortSignal) {
  // returns jsonb
  const data = await rpcWithRetry<any>(
    'get_client_analytics',
    { client_id: clientId },
    { signal, retries: 1 }
  );

  // Some setups return [json] instead of json. Normalize:
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Optional convenience export so imports like:
 *   import { clientsApi } from '@/lib/clientsApi'
 * work too.
 */
export const clientsApi = {
  rpcWithRetry,
  fetchClientsSummary,
  fetchClientSummary,
  fetchClientSitesPerformance,
  fetchClientSiteSummary,
  fetchClientOrdersPage,
  fetchClientAnalytics
};
