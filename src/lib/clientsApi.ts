// src/lib/clientsApi.ts
import { rpcWithRetry } from '@/lib/rpcWithRetry';

export interface ClientSummary {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientSummaryDetail {
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientOrderRow {
  id: string; // your RPC returns id as text (because orders/history_orders ids might not be uuid)
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

  // optional “site details” fields (must exist in your RPC return)
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

export interface ClientSiteSummary {
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
}

export interface ClientAnalytics {
  monthly_tons: { month: string; tons: number }[];
  status_breakdown: { status: string; count: number; percentage?: number }[];
  order_type_breakdown: { order_type: string; count: number; tons: number }[];
  shift_breakdown: { shift: string; count: number; tons: number }[];
  diameter_breakdown: { diameter: string; tons: number; percentage: number }[];
  diameter_totals: { total_breakdown_tons: number; total_order_tons: number; has_mismatch: boolean };
}

/**
 * Fetch list page (left panel): all clients summary
 */
export async function fetchClientsSummary(searchText?: string, signal?: AbortSignal): Promise<ClientSummary[]> {
  const payload = { search_text: searchText?.trim() ? searchText.trim() : null };

  const { data, error } = await rpcWithRetry<ClientSummary[]>('get_clients_summary', payload, { signal });

  if (error) throw error;
  return (data ?? []) as ClientSummary[];
}

/**
 * Fetch client header stats (top cards) for a specific client
 */
export async function fetchClientSummary(clientId: string, signal?: AbortSignal): Promise<ClientSummaryDetail> {
  const { data, error } = await rpcWithRetry<ClientSummaryDetail[]>('get_client_summary', { client_id: clientId }, { signal });

  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) throw new Error('No client summary returned from RPC (get_client_summary).');

  return row;
}

/**
 * Fetch orders table for a client (paged)
 */
export async function fetchClientOrdersPage(
  clientId: string,
  limit = 50,
  offset = 0,
  signal?: AbortSignal
): Promise<ClientOrdersPage> {
  const { data, error } = await rpcWithRetry<ClientOrderRow[]>(
    'get_client_orders_page',
    { client_id: clientId, limit_count: limit, offset_count: offset },
    { signal }
  );

  if (error) throw error;

  const rows = (data ?? []) as ClientOrderRow[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  return { rows, totalCount };
}

/**
 * Fetch site performance list for a client
 */
export async function fetchClientSitesPerformance(clientId: string, signal?: AbortSignal): Promise<ClientSitesPerformanceRow[]> {
  const { data, error } = await rpcWithRetry<ClientSitesPerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal }
  );

  if (error) throw error;
  return (data ?? []) as ClientSitesPerformanceRow[];
}

/**
 * Fetch one site “profile” (when clicking a site row)
 */
export async function fetchClientSiteSummary(clientId: string, siteId: string, signal?: AbortSignal): Promise<ClientSiteSummary> {
  const { data, error } = await rpcWithRetry<ClientSiteSummary[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal }
  );

  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) throw new Error('No site summary returned from RPC (get_client_site_summary).');

  return row;
}

/**
 * Fetch analytics payload (tons-only, no amount)
 */
export async function fetchClientAnalytics(clientId: string, signal?: AbortSignal): Promise<ClientAnalytics> {
  const { data, error } = await rpcWithRetry<ClientAnalytics>(
    'get_client_analytics',
    { client_id: clientId },
    { signal }
  );

  if (error) throw error;
  if (!data) throw new Error('No analytics returned from RPC (get_client_analytics).');

  return data;
}

