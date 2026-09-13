import { supabase, type Order } from './supabase';
import { ROUTES, routeTo } from '../routes/routes';

export type SearchGroup = 'Pages' | 'Orders' | 'History' | 'Clients' | 'Sites' | 'Drivers';
export interface SearchResult {
  key: string;
  group: SearchGroup;
  title: string;
  description: string;
  path?: string;
  order?: { table: 'orders' | 'history_orders'; id: string };
}
export interface SearchResponse { results: SearchResult[]; failedGroups: SearchGroup[] }
export const SEARCH_LIMIT = 6;
export const SEARCH_MAX_LENGTH = 100;

// PostgREST treats asterisks as wildcards. Treat them as separators instead,
// and escape SQL LIKE wildcards so user text cannot broaden the query.
export const normalizeSearch = (value: string) => value.slice(0, SEARCH_MAX_LENGTH).replace(/\*/g, ' ').trim();
export function searchFilter(columns: readonly string[], value: string): string {
  const literal = normalizeSearch(value).replace(/[\\%_]/g, '\\$&');
  // Quoting also protects commas, parentheses, quotes and backslashes in names.
  const pattern = JSON.stringify(`%${literal}%`);
  return columns.map(column => `${column}.ilike.${pattern}`).join(',');
}

const pages = [
  { title: 'Dashboard', path: ROUTES.dashboard, description: "Today's orders and deliveries", keywords: 'home dispatch orders delivery' },
  { title: 'History', path: ROUTES.history, description: 'Browse the order archive', keywords: 'archive delivered orders' },
  { title: 'Clients', path: ROUTES.clients, description: 'Client profiles and sites', keywords: 'customers companies sites' },
  { title: 'Drivers', path: ROUTES.drivers, description: 'Drivers and delivery activity', keywords: 'transport phone trucks' },
  { title: 'Inventory', path: ROUTES.inventory, description: 'Steel, coils, wire and couplers', keywords: 'stock warehouse qatar steel alwatania special length coils wire coupler' },
  { title: 'Offcut Usage', path: ROUTES.offcutUsage, description: 'Offcut usage and reports', keywords: 'scrap waste reports' },
  { title: 'Steel Analytics', path: ROUTES.steelAnalytics, description: 'Steel production and performance', keywords: 'reports tonnage trends' },
  { title: 'Users', path: ROUTES.users, description: 'User access and roles', keywords: 'admin permissions accounts', adminOnly: true },
];

export function searchPages(query: string, role?: string): SearchResult[] {
  const words = normalizeSearch(query).toLocaleLowerCase().split(/\s+/);
  return pages.filter(page => (!page.adminOnly || role === 'admin') &&
    words.every(word => `${page.title} ${page.description} ${page.keywords}`.toLocaleLowerCase().includes(word)))
    .map(page => ({ key: `page:${page.path}`, group: 'Pages', title: page.title, description: page.description, path: page.path }));
}

type Row = Record<string, string | null>;
const description = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');
const orderColumns = ['id', 'delivery_number', 'customer_name', 'company', 'site', 'driver_name', 'phone_number'];
const sources: { table: string; group: SearchGroup; select: string; columns: string[]; sort: string }[] = [
  ...(['orders', 'history_orders'] as const).map(table => ({ table, group: table === 'orders' ? 'Orders' as const : 'History' as const,
    select: 'id,delivery_number,customer_name,company,site,date,status', columns: orderColumns, sort: 'date' })),
  { table: 'clients', group: 'Clients', select: 'id,name', columns: ['name'], sort: 'name' },
  { table: 'client_sites', group: 'Sites', select: 'id,client_id,name,location_text,contact_name,contact_phone', columns: ['name', 'location_text', 'contact_name', 'contact_phone'], sort: 'name' },
  { table: 'drivers', group: 'Drivers', select: 'id,name,phone_number', columns: ['name', 'phone_number'], sort: 'name' },
];

export async function searchRecords(query: string, signal: AbortSignal): Promise<SearchResponse> {
  const term = normalizeSearch(query);
  if (term.length < 2 || signal.aborted) return { results: [], failedGroups: [] };
  const responses = await Promise.allSettled(sources.map(async source => {
    let request = supabase.from(source.table).select(source.select).or(searchFilter(source.columns, term));
    // Sites without a parent cannot be opened through the client-site route.
    if (source.group === 'Sites') request = request.not('client_id', 'is', null);
    const { data, error } = await request.order(source.sort, { ascending: source.sort !== 'date', nullsFirst: false })
      .order('id').limit(SEARCH_LIMIT).abortSignal(signal);
    if (error) throw error;
    return ((data ?? []) as unknown as Row[]).map((row): SearchResult => {
      const base = { key: `${source.table}:${row.id}`, group: source.group };
      if (source.table === 'orders' || source.table === 'history_orders') {
        return { ...base, title: row.delivery_number || row.id!,
          description: description(row.company || row.customer_name, row.site, row.date, row.status),
          order: { table: source.table, id: row.id! } };
      }
      if (source.group === 'Clients') return { ...base, title: row.name || 'Unnamed client', description: 'Client profile', path: routeTo.clientProfile(row.id!) };
      if (source.group === 'Sites') return { ...base, title: row.name || 'Unnamed site', description: description(row.location_text, row.contact_name, row.contact_phone) || 'Client site', path: routeTo.clientSite(row.client_id!, row.id!) };
      return { ...base, title: row.name || 'Unnamed driver', description: row.phone_number || 'Driver profile', path: routeTo.driverDetail(row.id!) };
    });
  }));
  if (signal.aborted) return { results: [], failedGroups: [] };
  return responses.reduce<SearchResponse>((result, response, index) => {
    if (response.status === 'fulfilled') result.results.push(...response.value);
    else result.failedGroups.push(sources[index].group);
    return result;
  }, { results: [], failedGroups: [] });
}

export async function fetchSearchOrder(order: NonNullable<SearchResult['order']>, signal: AbortSignal): Promise<Order> {
  const { data, error } = await supabase.from(order.table).select('*').eq('id', order.id).abortSignal(signal).single();
  if (error) throw error;
  return data as Order;
}
