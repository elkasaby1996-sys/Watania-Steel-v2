// src/lib/clientsApi.ts
import { supabase } from '@/lib/supabase';

type RpcResult<T> = { data: T | null; error: any };

const isAbortError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as any).name) : '';
  const message = 'message' in err ? String((err as any).message) : '';
  return name === 'AbortError' || message.includes('AbortError');
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Small retry wrapper for Supabase RPC calls.
 * Retries only on transient/network-ish failures; does NOT retry on abort.
 */
export async function rpcWithRetry<T>(
  fnName: string,
  args: Record<string, any> = {},
  opts?: { signal?: AbortSignal; retries?: number }
): Promise<T> {
  const retries = opts?.retries ?? 2;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    if (opts?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      // supabase-js v2: you can pass { signal } in options in some methods,
      // but rpc doesn't consistently support it across all builds.
      // We'll still respect AbortSignal before/after the request.
      const res: RpcResult<T> = await supabase.rpc(fnName as any, args as any);

      if (opts?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (res.error) throw res.error;
      return res.data as T;
    } catch (err: any) {
      if (isAbortError(err)) throw err;

      lastError = err;

      // Don't spam retries on obvious "function not found" / SQL errors
      const msg = String(err?.message ?? '');
      const code = String(err?.code ?? '');
      const status = Number(err?.status ?? 0);

      const isPermanent =
        msg.includes('does not exist') ||
        msg.includes('function') && msg.includes('does not exist') ||
        code === '42883' || // undefined_function
        code === '42P01' || // undefined_table
        status === 400 ||
        status === 401 ||
        status === 403;

      if (isPermanent || attempt === retries) {
        throw err;
      }

      // backoff: 250ms, 500ms, 1000ms...
      await sleep(250 * Math.pow(2, attempt));
      attempt += 1;
    }
  }

  throw lastError ?? new Error(`RPC ${fnName} failed`);
}

/** Types matching your RPC “tons-only” returns */
export type ClientSummaryRow = {
  id: string; // uuid
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null; // date
};

export type ClientTopCardSummary = {
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
};

export type ClientOrdersPageRow = {
  id: string; // your unified RPC returns id as text
  date: string | null; // date
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

export type SitePerformanceRow = {
  site_id: string; // uuid
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

export type SiteDetailsRow = {
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

export async function fetchClientsSummary(searchText?: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<ClientSummaryRow[]>(
    'get_clients_summary',
    { search_text: searchText ?? null },
    { signal }
  );
  return data ?? [];
}

export async function fetchClientSummary(clientId: string, signal?: AbortSignal) {
  const rows = await rpcWithRetry<ClientTopCardSummary[]>(
    'get_client_summary',
    { client_id: clientId },
    { signal }
  );
  return rows?.[0] ?? null;
}

export async function fetchClientSitesPerformance(clientId: string, signal?: AbortSignal) {
  const data = await rpcWithRetry<SitePerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal }
  );
  return data ?? [];
}

export async function fetchClientSiteSummary(clientId: string, siteId: string, signal?: AbortSignal) {
  const rows = await rpcWithRetry<SiteDetailsRow[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal }
  );
  return rows?.[0] ?? null;
}

export async function fetchClientOrdersPage(
  clientId: string,
  limit = 50,
  offset = 0,
  signal?: AbortSignal
) {
  const data = await rpcWithRetry<ClientOrdersPageRow[]>(
    'get_client_orders_page',
    {
      client_id: clientId,
      limit_count: limit,
      offset_count: offset
    },
    { signal }
  );
  return data ?? [];
}

/**
 * Convenience object export so components can do:
 *   import { clientsApi } from '@/lib/clientsApi';
 */
export const clientsApi = {
  rpcWithRetry,
  fetchClientsSummary,
  fetchClientSummary,
  fetchClientSitesPerformance,
  fetchClientSiteSummary,
  fetchClientOrdersPage
};


