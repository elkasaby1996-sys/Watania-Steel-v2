import { cachedRead, invalidateQueries } from './queryCache';
import { createClient } from '@supabase/supabase-js'
import { getEnvVar } from './env'
import { roundTo3Decimals } from './utils'
import { logger } from './logger'
import { normalizeOrderType } from './orderTypes'

// Get Supabase credentials from environment variables
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and local .env.'
  );
}

// Create Supabase client with the environment credentials
const createSupabaseClient = () => createClient(
  supabaseUrl,
  supabaseAnonKey
);
export const supabase: ReturnType<typeof createSupabaseClient> = import.meta.hot?.data.supabase ?? createSupabaseClient();

if (import.meta.hot) {
  import.meta.hot.dispose(data => { data.supabase = supabase; });
}

// Database types
export interface Order {
  id: string;
  customer_name: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  tons: number;
  shift: 'morning' | 'night';
  delivery_number?: string;
  company?: string;
  site?: string;
  client_id?: string | null;
  site_id?: string | null;
  driver_id?: string;
  driver_name?: string;
  phone_number?: string;
  delivered_at?: string;
  signed_delivery_note?: boolean;
  order_type?: 'straight-bar' | 'cut-and-bend';
  breakdown_8mm?: number;
  breakdown_10mm?: number;
  breakdown_12mm?: number;
  breakdown_14mm?: number;
  breakdown_16mm?: number;
  breakdown_18mm?: number;
  breakdown_20mm?: number;
  breakdown_25mm?: number;
  breakdown_32mm?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DriverMetrics {
  driver_id: string;
  driver_name: string;
  phone_number: string;
  is_active: boolean;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_tons: number;
  cycle_start: string;
  cycle_end: string;
}

export interface Activity {
  id: string;
  type: 'order_created' | 'order_updated' | 'order_completed';
  message: string;
  timestamp: string;
}

export interface HistoryOrder {
  id: string;
  customer_name: string;
  date: string;
  status: 'delivered' | 'in-progress';
  tons: number;
  shift: 'morning' | 'night';
  delivery_number?: string;
  company?: string;
  site?: string;
  client_id?: string | null;
  site_id?: string | null;
  driver_name?: string;
  phone_number?: string;
  delivered_at?: string;
  signed_delivery_note?: boolean;
  order_type?: 'straight-bar' | 'cut-and-bend';
  breakdown_8mm?: number;
  breakdown_10mm?: number;
  breakdown_12mm?: number;
  breakdown_14mm?: number;
  breakdown_16mm?: number;
  breakdown_18mm?: number;
  breakdown_20mm?: number;
  breakdown_25mm?: number;
  breakdown_32mm?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryOrderFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  company?: string;
  search?: string;
}

export interface HistoryOrderPage {
  data: HistoryOrder[];
  count: number;
  totalPages?: number;
  pageStart?: number;
  pageEnd?: number;
  aborted?: boolean;
}

type EnsureClientSiteResponse = {
  out_client_id?: string | null;
  out_site_id?: string | null;
  client_id?: string | null;
  site_id?: string | null;
};

type OrderClientSiteInput = {
  clientId?: string | null;
  client_id?: string | null;
  siteId?: string | null;
  site_id?: string | null;
  company?: string | null;
  site?: string | null;
};

const parseEnsureClientSiteResponse = (data: unknown): EnsureClientSiteResponse => {
  if (Array.isArray(data)) {
    return (data[0] ?? {}) as EnsureClientSiteResponse;
  }
  return (data ?? {}) as EnsureClientSiteResponse;
};

export async function ensureOrderClientSite(
  order: OrderClientSiteInput
): Promise<{ clientId: string | null; siteId: string | null }> {
  const existingClientId = order.clientId ?? order.client_id ?? null;
  const existingSiteId = order.siteId ?? order.site_id ?? null;
  const hasCompanyOrSiteInput = Boolean(order.company?.trim() || order.site?.trim());

  if (existingClientId && existingSiteId && !hasCompanyOrSiteInput) {
    return { clientId: existingClientId, siteId: existingSiteId };
  }

  const { data, error } = await supabase.rpc('ensure_client_site', {
    company_value: order.company ?? null,
    site_value: order.site ?? null
  });

  if (error) {
    throw error;
  }

  const resolved = parseEnsureClientSiteResponse(data);
  return {
    clientId: resolved.out_client_id ?? resolved.client_id ?? existingClientId ?? null,
    siteId: resolved.out_site_id ?? resolved.site_id ?? existingSiteId ?? null
  };
}

export async function verifyHistoryOrderClientLink(orderId: string): Promise<void> {
  const { data, error } = await supabase
    .from('history_orders')
    .select('client_id, site_id, company, site')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('❌ Failed to verify history order client link:', error);
    return;
  }

  const hasCompany = Boolean(data?.company && String(data.company).trim().length > 0);
  const hasSite = Boolean(data?.site && String(data.site).trim().length > 0);
  let missingClientLink = hasCompany && !data?.client_id;
  let missingSiteLink = hasSite && !data?.site_id;

  // Attempt one automatic repair before surfacing any warning.
  if (missingClientLink || missingSiteLink) {
    try {
      const { clientId, siteId } = await ensureOrderClientSite({
        client_id: data?.client_id ?? null,
        site_id: data?.site_id ?? null,
        company: data?.company ?? null,
        site: data?.site ?? null
      });

      if (clientId !== data?.client_id || siteId !== data?.site_id) {
        const { error: updateError } = await supabase
          .from('history_orders')
          .update({
            client_id: clientId,
            site_id: siteId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          throw updateError;
        }
      }

      missingClientLink = hasCompany && !clientId;
      missingSiteLink = hasSite && !siteId;
    } catch (repairError) {
      console.error('Failed to auto-repair history order client link:', repairError);
    }
  }

  if (missingClientLink || missingSiteLink) {
    console.warn(
      `History order ${orderId} is missing ${missingClientLink && missingSiteLink ? 'client/site' : missingClientLink ? 'client' : 'site'} link.`
    );
  }
}

// Helper functions to transform between DB and frontend formats
export const dbToFrontend = (dbOrder: Order): any => {
  return {
    id: dbOrder.id,
    customerName: dbOrder.customer_name,
    date: dbOrder.date,
    status: dbOrder.status,
    tons: dbOrder.tons,
    shift: dbOrder.shift,
    deliveryNumber: dbOrder.delivery_number || dbOrder.id,
    company: dbOrder.company,
    site: dbOrder.site,
    driverName: dbOrder.driver_name,
    phoneNumber: dbOrder.phone_number,
    deliveredAt: dbOrder.delivered_at,
    signedDeliveryNote: dbOrder.signed_delivery_note || false,
    orderType: normalizeOrderType(dbOrder.order_type),
    breakdown: {
      '8mm': Number(dbOrder.breakdown_8mm) || 0,
      '10mm': Number(dbOrder.breakdown_10mm) || 0,
      '12mm': Number(dbOrder.breakdown_12mm) || 0,
      '14mm': Number(dbOrder.breakdown_14mm) || 0,
      '16mm': Number(dbOrder.breakdown_16mm) || 0,
      '18mm': Number(dbOrder.breakdown_18mm) || 0,
      '20mm': Number(dbOrder.breakdown_20mm) || 0,
      '25mm': Number(dbOrder.breakdown_25mm) || 0,
      '32mm': Number(dbOrder.breakdown_32mm) || 0,
    },
  };
};

export const frontendToDb = (order: any): any => {
  return {
    id: order.id,
    customer_name: order.customerName,
    date: order.date,
    status: order.status,
    tons: order.tons,
    shift: order.shift,
    delivery_number: order.deliveryNumber || order.id,
    company: order.company,
    site: order.site,
    driver_name: order.driverName,
    phone_number: order.phoneNumber,
    delivered_at: order.deliveredAt,
    signed_delivery_note: order.signedDeliveryNote || false,
    order_type: normalizeOrderType(order.orderType),
    breakdown_8mm: Number(order.breakdown?.['8mm']) || 0,
    breakdown_10mm: Number(order.breakdown?.['10mm']) || 0,
    breakdown_12mm: Number(order.breakdown?.['12mm']) || 0,
    breakdown_14mm: Number(order.breakdown?.['14mm']) || 0,
    breakdown_16mm: Number(order.breakdown?.['16mm']) || 0,
    breakdown_18mm: Number(order.breakdown?.['18mm']) || 0,
    breakdown_20mm: Number(order.breakdown?.['20mm']) || 0,
    breakdown_25mm: Number(order.breakdown?.['25mm']) || 0,
    breakdown_32mm: Number(order.breakdown?.['32mm']) || 0,
  };
};

// Database operations
export const orderService = {
  async getActive(signal?: AbortSignal): Promise<Order[]> {
    const rows: Order[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from('orders').select('*')
        .neq('status', 'delivered')
        .order('created_at', { ascending: false }).order('id')
        .range(offset, offset + pageSize - 1);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []));
      if ((data || []).length < pageSize) return rows;
    }
  },

  async deliveryNumberExists(id: string): Promise<boolean> {
    const responses = await Promise.all([
      supabase.from('orders').select('id').eq('id', id).limit(1),
      supabase.from('history_orders').select('id').eq('id', id).limit(1),
    ]);
    for (const response of responses) if (response.error) throw response.error;
    return responses.some(({ data }) => Boolean(data?.length));
  },

  async getAll(): Promise<Order[]> {
    try {
      logger.debug('Fetching all orders from database...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      logger.debug('Raw data from database:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  },

  async create(order: any): Promise<Order> {
    try {
      const orderData = {
        ...order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Order creation failed:', error);
      throw error;
    }
  },

  async update(id: string, updates: any): Promise<Order> {
    try {
      logger.debug('🔄 Service: Updating active order:', id, updates);
      
      const { data, error } = await supabase
        .from('orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Order ${id} not found in active orders table`);
        }
        console.error('❌ Error updating order:', error);
        throw error;
      }
      
      logger.debug('✅ Active order updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to update active order:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete order:', error);
      throw error;
    }
  }
};

export const driverService = {
  getAll(signal?: AbortSignal): Promise<Driver[]> {
    return cachedRead('drivers:list', sharedSignal => this.getAllRaw(sharedSignal), signal);
  },
  async getAllRaw(signal?: AbortSignal): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true }).abortSignal(signal);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "drivers" does not exist')) {
          console.warn('Drivers table does not exist yet.');
          throw new Error('Failed to load drivers');
        }
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      throw new Error('Failed to load drivers');
    }
  },

  async create(driver: any): Promise<Driver> {
    try {
      const driverData = {
        id: `DRV-${Date.now()}`,
        name: driver.name,
        phone_number: driver.phone_number,
        is_active: driver.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('drivers')
        .insert([driverData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Driver creation failed:', error);
      throw error;
    }
  },

  async update(id: string, updates: any): Promise<Driver> {
    try {
      const validUpdates: any = {};
      if (updates.name !== undefined) validUpdates.name = updates.name;
      if (updates.phone_number !== undefined) validUpdates.phone_number = updates.phone_number;
      if (updates.is_active !== undefined) validUpdates.is_active = Boolean(updates.is_active);
      
      validUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('drivers')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update driver: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to update driver:', error);
      throw error;
    }
  },

  getById(id: string, signal?: AbortSignal): Promise<Driver | null> {
    return cachedRead('drivers:detail:' + id, sharedSignal => this.getByIdRaw(id, sharedSignal), signal);
  },
  async getByIdRaw(id: string, signal?: AbortSignal): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .abortSignal(signal).single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  getDriverOrdersPage(driverName: string, page = 1, pageSize = 50, signal?: AbortSignal): Promise<{ data: Order[]; totalCount: number }> {
    const safePage = Math.max(1, page);
    const limit = safePage * pageSize;
    return cachedRead('drivers:orders:' + JSON.stringify([driverName, safePage, pageSize]), async sharedSignal => {
      const tables = await Promise.all(['orders', 'history_orders'].map(async table => {
        const rows: Order[] = [];
        let totalCount = 0;
        for (let offset = 0; offset < limit; offset += 1000) {
          const { data, error, count } = await supabase.from(table)
            .select('id,customer_name,date,status,tons,shift,delivery_number,company,site,driver_name,phone_number,delivered_at',
              offset === 0 ? { count: 'exact' } : {})
            .eq('driver_name', driverName).order('date', { ascending: false }).order('id', { ascending: true })
            .range(offset, Math.min(offset + 999, limit - 1)).abortSignal(sharedSignal);
          if (error) throw new Error(error.message);
          if (offset === 0) totalCount = count ?? 0;
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < Math.min(1000, limit - offset)) break;
        }
        return { rows, totalCount };
      }));
      const rows = tables.flatMap(table => table.rows).sort((a, b) =>
        String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));
      return { data: rows.slice((safePage - 1) * pageSize, limit), totalCount: tables.reduce((sum, table) => sum + table.totalCount, 0) };
    }, signal);
  },

  getDriverOrders(driverName: string, startDate?: string, endDate?: string, signal?: AbortSignal): Promise<Order[]> {
    return cachedRead('drivers:range:' + JSON.stringify([driverName, startDate, endDate]), async sharedSignal => {
      const tables = await Promise.all(['orders', 'history_orders'].map(async table => {
        const rows: Order[] = [];
        for (let offset = 0; ; offset += 1000) {
          let query = supabase.from(table).select('*').eq('driver_name', driverName)
            .order('date', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 999);
          if (startDate) query = query.gte('date', startDate);
          if (endDate) query = query.lte('date', endDate);
          const { data, error } = await query.abortSignal(sharedSignal);
          if (error) throw new Error(error.message);
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < 1000) return rows;
        }
      }));
      return tables.flat().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }, signal);
  },

  async getDriverMetricsForDateRange(driverName: string, startDate: string, endDate: string, signal?: AbortSignal): Promise<any> {
    const orders = await this.getDriverOrders(driverName, startDate, endDate, signal);
    return { total_orders: orders.length, completed_orders: orders.filter(o => o.status === 'delivered').length,
      pending_orders: orders.filter(o => o.status === 'in-progress').length,
      total_tons: roundTo3Decimals(orders.reduce((sum, o) => sum + (Number(o.tons) || 0), 0)) };
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete driver:', error);
      throw error;
    }
  },

  async getMetrics(drivers?: Driver[], signal?: AbortSignal): Promise<DriverMetrics[]> {
    const now = new Date();
    const month = now.getMonth() - (now.getDate() < 25 ? 1 : 0);
    const cycleStartStr = new Date(now.getFullYear(), month, 25).toISOString().split('T')[0];
    const cycleEndStr = new Date(now.getFullYear(), month + 1, 25, 23, 59, 59).toISOString().split('T')[0];
    const list = drivers ?? await this.getAll();
    if (!list.length) return [];
    return cachedRead('drivers:metrics:' + cycleStartStr + ':' + JSON.stringify(list), async sharedSignal => {
      const pages = await Promise.all(['orders', 'history_orders'].map(async table => {
        const rows: { driver_name: string; status: string; tons: number }[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from(table).select('id,driver_name,status,tons')
            .gte('date', cycleStartStr).lte('date', cycleEndStr)
            .order('id', { ascending: true }).range(offset, offset + 999).abortSignal(sharedSignal);
          if (error) throw new Error(error.message);
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < 1000) return rows;
        }
      }));
      const grouped = new Map<string, { total: number; completed: number; tons: number }>();
      for (const row of pages.flat()) {
        const metrics = grouped.get(row.driver_name) ?? { total: 0, completed: 0, tons: 0 };
        metrics.total++; metrics.completed += Number(row.status === 'delivered');
        metrics.tons += Number(row.tons) || 0;
        grouped.set(row.driver_name, metrics);
      }
      return list.map(driver => {
        const metrics = grouped.get(driver.name) ?? { total: 0, completed: 0, tons: 0 };
        return { driver_id: driver.id, driver_name: driver.name, phone_number: driver.phone_number,
          is_active: driver.is_active, total_orders: metrics.total, completed_orders: metrics.completed,
          pending_orders: metrics.total - metrics.completed, total_tons: roundTo3Decimals(metrics.tons),
          cycle_start: cycleStartStr, cycle_end: cycleEndStr };
      });
    }, signal);
  }
};

const HISTORY_ORDER_LIST_COLUMNS =
  'id,customer_name,date,status,tons,shift,delivery_number,company,site,driver_name,phone_number,delivered_at,signed_delivery_note,order_type,breakdown_8mm,breakdown_10mm,breakdown_12mm,breakdown_14mm,breakdown_16mm,breakdown_18mm,breakdown_20mm,breakdown_25mm,breakdown_32mm';

export const historyService = {
  async getDeliveredOrderIds(orderIds: string[], signal?: AbortSignal): Promise<Set<string>> {
    const uniqueIds = Array.from(new Set(orderIds.map(id => String(id)).filter(Boolean)));
    const deliveredIds = new Set<string>();
    const chunkSize = 100;

    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);
      let query = supabase
        .from('history_orders')
        .select('id')
        .eq('status', 'delivered')
        .in('id', chunk);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "history_orders" does not exist')) {
          return deliveredIds;
        }
        throw error;
      }

      (data || []).forEach(order => {
        if (order?.id) {
          deliveredIds.add(String(order.id));
        }
      });
    }

    return deliveredIds;
  },

  async getAll(): Promise<HistoryOrder[]> {
    try {
      const { data, error } = await supabase
        .from('history_orders')
        .select('*')
        .order('delivered_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "history_orders" does not exist')) {
          console.warn('History orders table does not exist yet.');
          return [];
        }
        console.error('Database error fetching history orders:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch history orders:', error);
      return [];
    }
  },

  getPaginated(options: {
    page: number; pageSize: number; filters?: HistoryOrderFilters; signal?: AbortSignal; force?: boolean;
  }): Promise<HistoryOrderPage> {
    const { signal, force, ...params } = options;
    return cachedRead('history:' + JSON.stringify(params), async sharedSignal => {
      const result = await this.getPaginatedRaw({ ...params, signal: sharedSignal });
      if (result.aborted) throw new DOMException('Aborted', 'AbortError');
      return result;
    }, signal, { force });
  },

  async getPaginatedRaw(options: {
    page: number;
    pageSize: number;
    filters?: HistoryOrderFilters;
    signal?: AbortSignal;
  }): Promise<HistoryOrderPage> {
    const { page, pageSize, filters, signal } = options;
    const isAbortError = (error: unknown) => {
      if (!error) {
        return false;
      }
      if (error instanceof Error) {
        return (
          error.name === 'AbortError' ||
          error.message.includes('AbortError') ||
          error.message.includes('signal is aborted')
        );
      }
      return (
        typeof error === 'object' &&
        (('name' in error && (error as { name?: string }).name === 'AbortError') ||
          ('message' in error && String((error as { message?: string }).message).includes('AbortError')) ||
          ('details' in error && String((error as { details?: string }).details).includes('AbortError')))
      );
    };

    const applyFilters = (query: any) => {
      let filteredQuery = query;

      if (filters?.status) {
        filteredQuery = filteredQuery.eq('status', filters.status);
      }

      if (filters?.company) {
        filteredQuery = filteredQuery.ilike('company', `%${filters.company}%`);
      }

      if (filters?.dateFrom) {
        filteredQuery = filteredQuery.gte('delivered_at', `${filters.dateFrom}T00:00:00`);
      }

      if (filters?.dateTo) {
        filteredQuery = filteredQuery.lte('delivered_at', `${filters.dateTo}T23:59:59.999`);
      }

      if (filters?.search) {
        const term = filters.search.replace(/,/g, '').trim();
        if (term) {
          filteredQuery = filteredQuery.or([
            `id.ilike.%${term}%`,
            `delivery_number.ilike.%${term}%`,
            `customer_name.ilike.%${term}%`,
            `company.ilike.%${term}%`,
            `site.ilike.%${term}%`,
            `driver_name.ilike.%${term}%`,
            `phone_number.ilike.%${term}%`,
            `status.ilike.%${term}%`,
            `order_type.ilike.%${term}%`,
            `shift.ilike.%${term}%`
          ].join(','));
        }
      }

      return filteredQuery;
    };

    try {
      const safePage = Math.max(1, page);
      const from = (safePage - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = applyFilters(
        supabase
          .from('history_orders')
          .select(HISTORY_ORDER_LIST_COLUMNS, { count: 'exact' })
          .order('delivered_at', { ascending: false }).order('id', { ascending: true })
          .range(from, to)
      );

      if (signal) {
        query = query.abortSignal(signal);
      }

      const { data, error, count } = await query;

      if (error) {
        if (isAbortError(error)) {
          return { data: [], count: 0, aborted: true };
        }
        if (error.code === 'PGRST116' || error.message?.includes('relation "history_orders" does not exist')) {
          console.warn('History orders table does not exist yet.');
          return { data: [], count: 0, totalPages: 1, pageStart: 0, pageEnd: 0 };
        }
        throw new Error(error.message);
      }

      const totalCount = count || 0;
      if (totalCount === 0) {
        return { data: [], count: totalCount, totalPages: 1, pageStart: 0, pageEnd: 0 };
      }

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const rows = data || [];

      return {
        data: rows,
        count: totalCount,
        totalPages,
        pageStart: from + 1,
        pageEnd: from + rows.length
      };
    } catch (error) {
      if (isAbortError(error)) {
        return { data: [], count: 0, aborted: true };
      }
      throw error;
    }
  },

  async moveOrderToHistory(order: any): Promise<void> {
    try {
      logger.debug('🔄 Moving order to history:', order.id);
      
      const { data: existingHistory, error: existingHistoryError } = await supabase
        .from('history_orders')
        .select('id')
        .eq('id', order.id)
        .maybeSingle();

      if (existingHistoryError) {
        throw existingHistoryError;
      }

      const deliveredAt = order.deliveredAt || order.delivered_at || new Date().toISOString();
      const deliveredDate = String(deliveredAt).split('T')[0];

      const { clientId, siteId } = await ensureOrderClientSite({
        clientId: order.clientId,
        client_id: order.client_id,
        siteId: order.siteId,
        site_id: order.site_id,
        company: order.company,
        site: order.site
      });
      
      const historyOrderData = {
        id: order.id,
        customer_name: order.customerName,
        date: deliveredDate,
        status: 'delivered',
        tons: order.tons || 0,
        shift: order.shift || 'morning',
        delivery_number: order.deliveryNumber || order.id,
        company: order.company || '',
        site: order.site || '',
        client_id: clientId,
        site_id: siteId,
        driver_name: order.driverName || '',
        phone_number: order.phoneNumber || '',
        delivered_at: deliveredAt,
        signed_delivery_note: order.signedDeliveryNote || false,
        order_type: normalizeOrderType(order.orderType),
        breakdown_8mm: order.breakdown?.['8mm'] || 0,
        breakdown_10mm: order.breakdown?.['10mm'] || 0,
        breakdown_12mm: order.breakdown?.['12mm'] || 0,
        breakdown_14mm: order.breakdown?.['14mm'] || 0,
        breakdown_16mm: order.breakdown?.['16mm'] || 0,
        breakdown_18mm: order.breakdown?.['18mm'] || 0,
        breakdown_20mm: order.breakdown?.['20mm'] || 0,
        breakdown_25mm: order.breakdown?.['25mm'] || 0,
        breakdown_32mm: order.breakdown?.['32mm'] || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (import.meta.env.DEV) {
        logger.debug('🔗 History move client link:', {
          orderId: order.id,
          clientId,
          siteId
        });
      }
      
      if (existingHistory) {
        const { error: updateHistoryError } = await supabase
          .from('history_orders')
          .update(historyOrderData)
          .eq('id', order.id);
        if (updateHistoryError) {
          throw updateHistoryError;
        }
      } else {
        const { error: insertHistoryError } = await supabase
          .from('history_orders')
          .insert([historyOrderData]);
        if (insertHistoryError) {
          throw insertHistoryError;
        }
      }

      await verifyHistoryOrderClientLink(order.id);
      
      const { data: deletedActiveRows, error: deleteActiveError } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id)
        .select('id');
      if (deleteActiveError) {
        throw deleteActiveError;
      }

      // Some RLS setups can return zero deleted rows without throwing an error.
      // Fallback to marking active row as delivered so it no longer appears in active views.
      if (!deletedActiveRows || deletedActiveRows.length === 0) {
        logger.warn('No active order row deleted during history move; applying delivered fallback status', {
          orderId: order.id
        });

        const { error: fallbackUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'delivered',
            delivered_at: deliveredAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (fallbackUpdateError) {
          throw fallbackUpdateError;
        }
      }
      
      logger.debug('✅ Order moved to history successfully');
    } catch (error) {
      console.error('❌ Failed to move order to history:', error);
      throw error;
    }
  },

  async moveOrderToActive(order: any): Promise<void> {
    try {
      logger.debug('🔄 Service: Moving order back to active:', order.id);

      const { clientId, siteId } = await ensureOrderClientSite({
        clientId: order.client_id,
        siteId: order.site_id,
        company: order.company,
        site: order.site
      });
      
      const activeOrderData = {
        id: order.id,
        customer_name: order.customer_name,
        date: order.date,
        status: 'in-progress',
        tons: order.tons || 0,
        shift: order.shift || 'morning',
        delivery_number: order.delivery_number || order.id,
        company: order.company || '',
        site: order.site || '',
        client_id: clientId,
        site_id: siteId,
        driver_name: order.driver_name || '',
        phone_number: order.phone_number || '',
        delivered_at: null,
        signed_delivery_note: order.signed_delivery_note || false,
        order_type: normalizeOrderType(order.order_type),
        breakdown_8mm: order.breakdown_8mm || 0,
        breakdown_10mm: order.breakdown_10mm || 0,
        breakdown_12mm: order.breakdown_12mm || 0,
        breakdown_14mm: order.breakdown_14mm || 0,
        breakdown_16mm: order.breakdown_16mm || 0,
        breakdown_18mm: order.breakdown_18mm || 0,
        breakdown_20mm: order.breakdown_20mm || 0,
        breakdown_25mm: order.breakdown_25mm || 0,
        breakdown_32mm: order.breakdown_32mm || 0,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await supabase
        .from('orders')
        .upsert([activeOrderData]);
      
      await supabase
        .from('history_orders')
        .delete()
        .eq('id', order.id);
      
      logger.debug('✅ Service: Order moved back to active successfully');
    } catch (error) {
      console.error('❌ Service: Failed to move order to active:', error);
      throw error;
    }
  },

  async update(id: string, updates: any): Promise<HistoryOrder> {
    try {
      const { data: existingOrder } = await supabase
        .from('history_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!existingOrder) {
        throw new Error(`Order ${id} not found in history orders table`);
      }

      const resolvedCompany = updates.company ?? existingOrder.company ?? null;
      const resolvedSite = updates.site ?? existingOrder.site ?? null;
      const { clientId, siteId } = await ensureOrderClientSite({
        clientId: updates.client_id ?? existingOrder.client_id ?? null,
        siteId: updates.site_id ?? existingOrder.site_id ?? null,
        company: resolvedCompany,
        site: resolvedSite
      });
      
      const updateData: any = {
        ...updates,
        client_id: clientId,
        site_id: siteId,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('history_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to update history order:', error);
      throw error;
    }
  }
};

// Inventory service for managing steel inventory tables
export const inventoryService = {
  // Fetch all data from a specific inventory table
  getTableData(tableName: string, signal?: AbortSignal): Promise<Record<string, any>[]> {
    return cachedRead('inventory:' + tableName, async sharedSignal => {
      const { data, error } = await supabase.from(tableName).select('*').abortSignal(sharedSignal);
      if (error) throw new Error(error.message);
      return data ?? [];
    }, signal);
  },

  // Fetch all inventory data from all 6 tables
  async getAllInventory(): Promise<{
    qatar_steel: Record<string, any>[];
    al_watania_steel: Record<string, any>[];
    special_length: Record<string, any>[];
    coils: Record<string, any>[];
    wire: Record<string, any>[];
    coupler: Record<string, any>[];
  }> {
    try {
      const [qatar_steel, al_watania_steel, special_length, coils, wire, coupler] = await Promise.all([
        this.getTableData('qatar_steel'),
        this.getTableData('al_watania_steel'),
        this.getTableData('special_length'),
        this.getTableData('coils'),
        this.getTableData('wire'),
        this.getTableData('coupler'),
      ]);

      return {
        qatar_steel,
        al_watania_steel,
        special_length,
        coils,
        wire,
        coupler,
      };
    } catch (error) {
      console.error('Failed to fetch all inventory:', error);
      return {
        qatar_steel: [],
        al_watania_steel: [],
        special_length: [],
        coils: [],
        wire: [],
        coupler: [],
      };
    }
  },

  // Update a single row in an inventory table
  async updateRow(
    tableName: string,
    rowId: string | number,
    updates: Record<string, any>,
    idColumn: string = 'id'
  ): Promise<Record<string, any> | null> {
    try {
      // Remove non-editable fields from updates
      const editableUpdates = { ...updates };
      delete editableUpdates.id;
      delete editableUpdates.created_at;
      delete editableUpdates.updated_at;
      delete editableUpdates.user_id;

      // Add updated_at timestamp if the table has it
      editableUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from(tableName)
        .update(editableUpdates)
        .eq(idColumn, rowId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${tableName}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Failed to update ${tableName}:`, error);
      throw error;
    }
  },

  // Update multiple rows in an inventory table
  async updateMultipleRows(
    tableName: string,
    updates: Array<{ id: string | number; data: Record<string, any>; idColumn?: string }>
  ): Promise<void> {
    try {
      await Promise.all(
        updates.map(({ id, data, idColumn }) =>
          this.updateRow(tableName, id, data, idColumn || 'id')
        )
      );
    } catch (error) {
      console.error(`Failed to update multiple rows in ${tableName}:`, error);
      throw error;
    }
  },
};

// Interface for offcut usage entries
export interface OffcutUsageEntry {
  id: string;
  date: string;
  company: string;
  bar_diameter: string;
  pieces_used: number;
  weight_kg: number;
  weight_tons: number;
  notes: string | null;
  created_at?: string;
}

// Interface for diameter totals
export interface DiameterTotal {
  bar_diameter: string;
  total_pieces: number;
  total_tons: number;
}

// Offcut Usage service for tracking offcut steel usage
export const offcutUsageService = {
  getByDate(date: string, signal?: AbortSignal): Promise<OffcutUsageEntry[]> {
    return this.getByDateRange(date, date, signal);
  },
  getByMonth(year: number, month: number, signal?: AbortSignal): Promise<OffcutUsageEntry[]> {
    const start = String(year) + '-' + String(month).padStart(2, '0') + '-01';
    const end = String(year) + '-' + String(month).padStart(2, '0') + '-' + String(new Date(year, month, 0).getDate());
    return this.getByDateRange(start, end, signal);
  },
  getByDateRange(startDate: string, endDate: string, signal?: AbortSignal): Promise<OffcutUsageEntry[]> {
    return cachedRead('offcut:' + startDate + ':' + endDate, async sharedSignal => {
      const rows: OffcutUsageEntry[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from('offcut_usage').select('*')
          .gte('date', startDate).lte('date', endDate)
          .order('date', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: true })
          .range(offset, offset + 999).abortSignal(sharedSignal);
        if (error) throw new Error(error.message);
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) return rows;
      }
    }, signal);
  },

  // Create a new offcut usage entry
  async create(entry: Omit<OffcutUsageEntry, 'id' | 'created_at'>): Promise<OffcutUsageEntry> {
    try {
      const entryData = {
        ...entry,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('offcut_usage')
        .insert([entryData])
        .select()
        .single();

      if (error) {
        console.error('Error creating offcut usage entry:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create offcut usage entry:', error);
      throw error;
    }
  },

  // Update an offcut usage entry
  async update(id: string, updates: Partial<OffcutUsageEntry>): Promise<OffcutUsageEntry> {
    try {
      const { data, error } = await supabase
        .from('offcut_usage')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating offcut usage entry:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update offcut usage entry:', error);
      throw error;
    }
  },

  // Delete an offcut usage entry
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('offcut_usage')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting offcut usage entry:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete offcut usage entry:', error);
      throw error;
    }
  },

  // Create multiple offcut usage entries in bulk
  async createBulk(entries: Omit<OffcutUsageEntry, 'id' | 'created_at'>[]): Promise<OffcutUsageEntry[]> {
    try {
      const entriesData = entries.map(entry => ({
        ...entry,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('offcut_usage')
        .insert(entriesData)
        .select();

      if (error) {
        console.error('Error creating bulk offcut usage entries:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to create bulk offcut usage entries:', error);
      throw error;
    }
  },

  // Get unique company names that have orders on a specific date.
  async getCompaniesWorkedOnDate(date: string): Promise<string[]> {
    try {
      const [ordersResponse, historyResponse] = await Promise.all([
        supabase
          .from('orders')
          .select('company')
          .eq('date', date)
          .not('company', 'is', null),
        supabase
          .from('history_orders')
          .select('company')
          .eq('date', date)
          .not('company', 'is', null)
      ]);

      if (ordersResponse.error) {
        throw ordersResponse.error;
      }
      if (historyResponse.error) {
        throw historyResponse.error;
      }

      const rows = [...(ordersResponse.data || []), ...(historyResponse.data || [])];
      const uniqueCompanies = new Map<string, string>();

      rows.forEach((row) => {
        const company = String(row.company ?? '').trim();
        if (!company) {
          return;
        }
        const key = company.toLowerCase();
        if (!uniqueCompanies.has(key)) {
          uniqueCompanies.set(key, company);
        }
      });

      return Array.from(uniqueCompanies.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
    } catch (error) {
      console.error('Failed to fetch companies worked on date:', error);
      return [];
    }
  },

  // Calculate diameter totals from entries
  calculateDiameterTotals(entries: OffcutUsageEntry[]): DiameterTotal[] {
    const totalsMap = new Map<string, { pieces: number; tons: number }>();

    for (const entry of entries) {
      const existing = totalsMap.get(entry.bar_diameter) || { pieces: 0, tons: 0 };
      totalsMap.set(entry.bar_diameter, {
        pieces: existing.pieces + entry.pieces_used,
        tons: existing.tons + entry.weight_tons
      });
    }

    return Array.from(totalsMap.entries())
      .map(([bar_diameter, totals]) => ({
        bar_diameter,
        total_pieces: totals.pieces,
        total_tons: roundTo3Decimals(totals.tons)
      }))
      .sort((a, b) => {
        // Sort by diameter size (numeric)
        const aNum = parseInt(a.bar_diameter.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(b.bar_diameter.replace(/\D/g, ''), 10) || 0;
        return aNum - bNum;
      });
  }
};

export const activityService = {
  async getRecent(limit: number = 10): Promise<Activity[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  },

  async create(activity: any): Promise<Activity> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          ...activity,
          id: `ACT-${Date.now()}`,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to create activity:', error);
      return {
        ...activity,
        id: `ACT-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Invalidate dependent reads only after a write succeeds. Each changed inventory
// row invalidates independently so partial batch success cannot leave stale data.
function invalidateAfterWrites<T extends object>(service: T, methods: (keyof T)[], prefixes: string[]) {
  for (const method of methods) {
    const original = service[method] as (...args: any[]) => Promise<any>;
    service[method] = (async function(this: T, ...args: any[]) {
      const result = await original.apply(this, args);
      prefixes.forEach(prefix => invalidateQueries(prefix));
      return result;
    }) as T[keyof T];
  }
}
invalidateAfterWrites(orderService, ['create', 'update', 'delete'], ['history:', 'drivers:', 'clients:', 'analytics:']);
invalidateAfterWrites(historyService, ['update', 'moveOrderToHistory', 'moveOrderToActive'], ['history:', 'drivers:', 'clients:', 'analytics:']);
invalidateAfterWrites(driverService, ['create', 'update', 'delete'], ['drivers:']);
invalidateAfterWrites(inventoryService, ['updateRow'], ['inventory:']);
invalidateAfterWrites(offcutUsageService, ['create', 'update', 'delete', 'createBulk'], ['offcut:']);
