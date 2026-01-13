import { supabase } from '@/lib/supabase';

async function rpc<T>(fnName: string, args: Record<string, any>, _signal?: AbortSignal): Promise<T> {
  const { data, error } = await supabase.rpc(fnName as any, args as any);
  if (error) throw error;
  return data as T;
}

/** ---------- Types ---------- */

export type ClientSummary = {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null; // date
};

export type ClientTopSummary = {
  client_id?: string;
  client_name?: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  notes?: string | null;
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
  contact_email: string | null;
  location_text: string | null;
  address: string | null;
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
  contact_email: string | null;
  location_text: string | null;
  address: string | null;
  google_maps_url: string | null;
  notes: string | null;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null; // date
};

export type ClientSiteRecord = {
  id: string;
  client_id: string | null;
  name?: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location_text: string | null;
  address: string | null;
  google_maps_url: string | null;
  notes: string | null;
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
  const data = await rpc<ClientSummary[]>(
    'get_clients_summary',
    { search_text: searchText ?? null },
    signal
  );
  return data ?? [];
}

export async function fetchClientSummary(clientId: string, signal?: AbortSignal) {
  const data = await rpc<ClientTopSummary[]>(
    'get_client_summary',
    { client_id: clientId },
    signal
  );
  return data?.[0] ?? null;
}

export async function fetchClientSitesPerformance(clientId: string, signal?: AbortSignal) {
  const data = await rpc<ClientSitePerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    signal
  );
  return data ?? [];
}

export async function fetchClientSiteSummary(clientId: string, siteId: string, signal?: AbortSignal) {
  const data = await rpc<ClientSiteDetails[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    signal
  );
  return data?.[0] ?? null;
}

export async function fetchClientSiteOrdersPage(
  clientId: string,
  siteId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<ClientOrdersPageResult> {
  const offset = Math.max(0, (page - 1) * pageSize);
  const data = await rpc<ClientOrderRow[]>(
    'get_client_site_orders_page',
    { client_id: clientId, site_id: siteId, limit_count: pageSize, offset_count: offset },
    signal
  );

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
  return { rows, totalCount };
}

export async function fetchClientOrdersPage(
  clientId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<ClientOrdersPageResult> {
  const offset = Math.max(0, (page - 1) * pageSize);
  const data = await rpc<ClientOrderRow[]>(
    'get_client_orders_page',
    { client_id: clientId, limit_count: pageSize, offset_count: offset },
    signal
  );

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
  return { rows, totalCount };
}

export async function fetchClientAnalytics(clientId: string, signal?: AbortSignal) {
  // This RPC returns jsonb (not an array)
  const data = await rpc<ClientAnalytics>(
    'get_client_analytics',
    { client_id: clientId },
    signal
  );
  return data ?? null;
}

export type ClientSitePatch = Partial<{
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location_text: string | null;
  address: string | null;
  google_maps_url: string | null;
  notes: string | null;
}>;

export type ClientPatch = Partial<{
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
}>;

export async function updateClient(
  clientId: string,
  patch: ClientPatch,
  _signal?: AbortSignal
): Promise<ClientTopSummary> {
  const data = await rpc<ClientTopSummary>(
    'update_client',
    {
      p_client_id: clientId,
      p_contact_name: patch.contact_name ?? null,
      p_contact_email: patch.contact_email ?? null,
      p_contact_phone: patch.contact_phone ?? null,
      p_address: patch.address ?? null,
      p_notes: patch.notes ?? null
    },
    _signal
  );

  return data;
}

export async function updateClientSite(
  siteId: string,
  patch: ClientSitePatch,
  _signal?: AbortSignal
): Promise<ClientSiteRecord> {
  const data = await rpc<ClientSiteRecord>(
    'update_site',
    {
      p_site_id: siteId,
      p_contact_name: patch.contact_name ?? null,
      p_contact_phone: patch.contact_phone ?? null,
      p_location_text: patch.location_text ?? null,
      p_google_maps_url: patch.google_maps_url ?? null,
      p_notes: patch.notes ?? null
    },
    _signal
  );

  return data as ClientSiteRecord;
}

export async function mergeClientSites(
  clientId: string,
  primarySiteId: string,
  duplicateSiteId: string,
  newPrimaryName?: string | null,
  _signal?: AbortSignal
): Promise<{ [key: string]: any }> {
  const data = await rpc<{ [key: string]: any }>(
    'merge_client_sites',
    {
      p_client_id: clientId,
      p_primary_site_id: primarySiteId,
      p_duplicate_site_id: duplicateSiteId,
      p_new_primary_name: newPrimaryName ?? null
    },
    _signal
  );

  return data ?? {};
}

/**
 * Optional convenience object (so imports like `clientsApi.fetchClientSummary` also work)
 */
export const clientsApi = {
  fetchClientsSummary,
  fetchClientSummary,
  fetchClientSitesPerformance,
  fetchClientSiteSummary,
  fetchClientSiteOrdersPage,
  fetchClientOrdersPage,
  fetchClientAnalytics,
  updateClient,
  updateClientSite,
  mergeClientSites
};
