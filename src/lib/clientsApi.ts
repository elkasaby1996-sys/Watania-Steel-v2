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
  // NOTE: your RPC currently returns totals + last_order_date.
  // If your SQL returns fewer fields, you can remove the extra ones below.
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;

  // Optional profile fields (keep optional so UI doesn’t break if null / not returned)
  client_id?: string;
  client_name?: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  notes?: string | null;
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
  total_count: number; // from COUNT(*) OVER()
}

export interface ClientOrdersPage {
  rows: ClientOrderRow[];
  totalCount: number;
}

export interface ClientSitesPerformanceRow {
  site_id: string;
  site_name: string;

  // site details (nullable)
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;

  // totals
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
}

export interface ClientAnalytics {
  monthly_tons: { month: string; tons: number }[];
  status_breakdown: { status: string; count: number }[];
  order_type_breakdown: { order_type: string; count: number; tons: number }[];
  shift_breakdown: { shift: string; count: number; tons: number }[];
  diameter_breakdown: { diameter: string; tons: number; percentage: number }[];
  diameter_totals: { total_breakdown_tons: number; total_order_tons: number; has_mismatch: boolean };
}

export interface ClientSiteSummary {
  site_id: string;
  site_name: string;
  client_id: string;
  client_name: string;

  // details
  contact_name: string | null;
  contact_phone: string | null;
  contact_email?: string | null;
  address?: string | null;
  location_text: string | null;
  google_maps_url: string | null;
  notes: string | null;

  // totals
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
}

/**
 * Low-level fetchers (easy for components/hooks to call)
 */

export const fetchClientsSummary = async (
  searchText?: string,
  signal?: AbortSignal
): Promise<ClientSummary[]> => {
  const { data, error } = await rpcWithRetry<ClientSummary[]>(
    'get_clients_summary',
    { search_text: searchText?.trim() || null },
    { signal }
  );

  if (error) throw error;
  return (data || []) as ClientSummary[];
};

export const fetchClientSummary = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientSummaryDetail> => {
  const { data, error } = await rpcWithRetry<ClientSummaryDetail[]>(
    'get_client_summary',
    { client_id: clientId },
    { signal }
  );

  if (error) throw error;

  const rows = (data || []) as ClientSummaryDetail[];
  const row = rows[0];
  if (!row) throw new Error('Unable to load client summary');

  return row;
};

export const fetchClientOrdersPage = async (
  clientId: string,
  limit = 50,
  offset = 0,
  signal?: AbortSignal
): Promise<ClientOrdersPage> => {
  const { data, error } = await rpcWithRetry<ClientOrderRow[]>(
    'get_client_orders_page',
    { client_id: clientId, limit_count: limit, offset_count: offset },
    { signal }
  );

  if (error) throw error;

  const rows = (data || []) as ClientOrderRow[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

  return { rows, totalCount };
};

export const fetchClientSitesPerformance = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientSitesPerformanceRow[]> => {
  const { data, error } = await rpcWithRetry<ClientSitesPerformanceRow[]>(
    'get_client_sites_performance',
    { client_id: clientId },
    { signal }
  );

  if (error) throw error;
  return (data || []) as ClientSitesPerformanceRow[];
};

export const fetchClientSiteSummary = async (
  clientId: string,
  siteId: string,
  signal?: AbortSignal
): Promise<ClientSiteSummary> => {
  const { data, error } = await rpcWithRetry<ClientSiteSummary[]>(
    'get_client_site_summary',
    { client_id: clientId, site_id: siteId },
    { signal }
  );

  if (error) throw error;

  const rows = (data || []) as ClientSiteSummary[];
  const row = rows[0];
  if (!row) throw new Error('Unable to load site summary');

  return row;
};

export const fetchClientAnalytics = async (
  clientId: string,
  signal?: AbortSignal
): Promise<ClientAnalytics> => {
  const { data, error } = await rpcWithRetry<ClientAnalytics>(
    'get_client_analytics',
    { client_id: clientId },
    { signal }
  );

  if (error) throw error;
  if (!data) throw new Error('Unable to load analytics');

  return data;
};

/**
 * Convenience API object (if your components prefer clientsApi.xxx())
 */
export const clientsApi = {
  getClientsSummary: fetchClientsSummary,
  getClientSummary: fetchClientSummary,
  getClientOrdersPage: fetchClientOrdersPage,
  getClientSitesPerformance: fetchClientSitesPerformance,
  getClientSiteSummary: fetchClientSiteSummary,
  getClientAnalytics: fetchClientAnalytics,
};
