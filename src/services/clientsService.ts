import { supabase } from '@/lib/supabase';

export interface ClientSummary {
  id: string;
  name: string;
  total_orders: number;
  total_tons: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientProfile {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientStats {
  total_orders: number;
  total_tons: number;
  total_amount: number;
  unique_sites: number;
  last_order_date: string | null;
}

export interface ClientOrderRow {
  id: string;
  date: string | null;
  status: string | null;
  amount: number | null;
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
  orders: ClientOrderRow[];
  total: number;
}

export interface ClientSitesPerformanceRow {
  site_id: string;
  site_name: string;
  total_orders: number;
  total_tons: number;
  last_order_date: string | null;
}

export interface ClientAnalytics {
  monthly_tons: { month: string; tons: number }[];
  monthly_amount: { month: string; amount: number }[];
  status_breakdown: { status: string; count: number; percentage: number }[];
  order_type_breakdown: { order_type: string; count: number; tons: number; amount: number }[];
  shift_breakdown: { shift: string; count: number; tons: number; amount: number }[];
  diameter_breakdown: { diameter: string; tons: number; percentage: number }[];
  diameter_totals: { total_breakdown_tons: number; total_order_tons: number; has_mismatch: boolean };
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

export interface ClientSiteUpdate {
  contact_name?: string | null;
  contact_phone?: string | null;
  location_text?: string | null;
  google_maps_url?: string | null;
  notes?: string | null;
}

export const clientsService = {
  async getClientsSummary(searchText?: string): Promise<ClientSummary[]> {
    const { data, error } = await supabase.rpc('get_clients_summary', {
      search_text: searchText?.trim() || null,
    });

    if (error) {
      console.error('Failed to load clients summary:', error);
      throw error;
    }

    return (data || []) as ClientSummary[];
  },

  async getClientProfile(clientId: string): Promise<ClientProfile> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error || !data) {
      console.error('Failed to load client profile:', error);
      throw error || new Error('Client not found');
    }

    return data as ClientProfile;
  },

  async updateClientProfile(clientId: string, updates: Partial<ClientProfile>): Promise<ClientProfile> {
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Failed to update client profile:', error);
      throw error || new Error('Unable to update client');
    }

    return data as ClientProfile;
  },

  async getClientStats(clientId: string): Promise<ClientStats> {
    const { data, error } = await supabase.rpc('get_client_summary', {
      client_id: clientId,
    });

    const rows = (data || []) as ClientStats[];
    const row = rows[0];

    if (error || !row) {
      console.error('Failed to load client stats:', error);
      throw error || new Error('Unable to load stats');
    }

    return row;
  },

  async getClientOrdersPage(clientId: string, limit = 50, offset = 0): Promise<ClientOrdersPage> {
    const { data, error } = await supabase.rpc('get_client_orders_page', {
      client_id: clientId,
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error('Failed to load client orders:', error);
      throw error;
    }

    const rows = (data || []) as ClientOrderRow[];
    const total = rows.length > 0 ? rows[0].total_count : 0;

    return { orders: rows, total };
  },

  async getClientAnalytics(clientId: string): Promise<ClientAnalytics> {
    const { data, error } = await supabase.rpc('get_client_analytics', {
      client_id: clientId,
    });

    if (error || !data) {
      console.error('Failed to load client analytics:', error);
      throw error || new Error('Unable to load analytics');
    }

    return data as ClientAnalytics;
  },

  async getClientSitesPerformance(clientId: string): Promise<ClientSitesPerformanceRow[]> {
    const { data, error } = await supabase.rpc('get_client_sites_performance', {
      client_id: clientId,
    });

    if (error) {
      console.error('Failed to load client sites performance:', error);
      throw error;
    }

    return (data || []) as ClientSitesPerformanceRow[];
  },

  async getClientSiteSummary(clientId: string, siteId: string): Promise<ClientSiteSummary> {
    const { data, error } = await supabase.rpc('get_client_site_summary', {
      client_id: clientId,
      site_id: siteId,
    });

    const rows = (data || []) as ClientSiteSummary[];
    const row = rows[0];

    if (error || !row) {
      console.error('Failed to load client site summary:', error);
      throw error || new Error('Unable to load site summary');
    }

    return row;
  },

  async updateClientSite(siteId: string, updates: ClientSiteUpdate): Promise<ClientSiteUpdate> {
    const { data, error } = await supabase
      .from('client_sites')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId)
      .select('contact_name, contact_phone, location_text, google_maps_url, notes')
      .single();

    if (error || !data) {
      console.error('Failed to update client site:', error);
      throw error || new Error('Unable to update site details');
    }

    return data as ClientSiteUpdate;
  },
};
