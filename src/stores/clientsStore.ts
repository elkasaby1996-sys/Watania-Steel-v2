import { create } from 'zustand';

// Local types to avoid import issues
interface ClientData {
  company: string;
  totalOrders: number;
  totalTons: number;
  totalAmount: number;
  uniqueSitesCount: number;
  lastOrderDate: string;
}

interface UnifiedOrder {
  id: string;
  date: string;
  status: string;
  amount: number;
  tons: number;
  company: string;
  site: string;
  order_type: string;
  shift: string;
  delivered_at: string | null;
  signed_delivery_note: boolean;
  created_at: string;
  updated_at: string;
  delivery_number: string;
  driver_name: string;
  phone_number: string;
  customer_name: string;
  source: 'orders' | 'history_orders';
  breakdown_8mm?: number;
  breakdown_10mm?: number;
  breakdown_12mm?: number;
  breakdown_14mm?: number;
  breakdown_16mm?: number;
  breakdown_18mm?: number;
  breakdown_20mm?: number;
  breakdown_25mm?: number;
  breakdown_32mm?: number;
}

interface ClientsState {
  // List page state
  clients: ClientData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;

  // Detail page state
  selectedClient: ClientData | null;
  clientOrders: UnifiedOrder[];
  clientOrdersTotal: number;
  clientOrdersPage: number;
  clientOrdersLoading: boolean;
  clientOrdersError: string | null;

  // Actions
  setSearchQuery: (query: string) => void;
  loadClients: () => Promise<void>;
  getFilteredClients: () => ClientData[];

  // Detail page actions
  loadClientBySlug: (slug: string) => Promise<ClientData | null>;
  loadClientOrders: (company: string, page?: number) => Promise<void>;
  setClientOrdersPage: (page: number) => void;
  clearClientDetail: () => void;
}

const PAGE_SIZE = 200;

export const useClientsStore = create<ClientsState>((set, get) => ({
  // Initial state
  clients: [],
  loading: false,
  error: null,
  searchQuery: '',

  selectedClient: null,
  clientOrders: [],
  clientOrdersTotal: 0,
  clientOrdersPage: 1,
  clientOrdersLoading: false,
  clientOrdersError: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  loadClients: async () => {
    set({ loading: true, error: null });
    try {
      const { clientService } = await import('../lib/supabase');

      // Fetch unified orders with default 180 day range and 2000 limit per table
      const { orders, historyOrders } = await clientService.getUnifiedOrders();

      // Group by client and compute aggregations
      const clients = clientService.mergeAndGroupByClient(orders, historyOrders);

      set({ clients, loading: false });
    } catch (error) {
      console.error('Failed to load clients:', error);
      set({
        clients: [],
        error: error instanceof Error ? error.message : 'Failed to load clients',
        loading: false,
      });
    }
  },

  getFilteredClients: () => {
    const { clients, searchQuery } = get();
    if (!searchQuery.trim()) return clients;

    const search = searchQuery.toLowerCase();
    return clients.filter((client) =>
      client.company.toLowerCase().includes(search)
    );
  },

  loadClientBySlug: async (slug: string) => {
    try {
      const { findCompanyBySlug } = await import('../lib/utils');
      const { clients, loadClients } = get();

      // If clients not loaded yet, load them first
      if (clients.length === 0) {
        await loadClients();
      }

      const currentClients = get().clients;
      const companyNames = currentClients.map((c) => c.company);
      const companyName = findCompanyBySlug(slug, companyNames);

      if (!companyName) {
        set({ selectedClient: null });
        return null;
      }

      const client = currentClients.find((c) => c.company === companyName) || null;
      set({ selectedClient: client });
      return client;
    } catch (error) {
      console.error('Failed to load client by slug:', error);
      set({ selectedClient: null });
      return null;
    }
  },

  loadClientOrders: async (company: string, page: number = 1) => {
    set({ clientOrdersLoading: true, clientOrdersError: null, clientOrdersPage: page });
    try {
      const { clientService } = await import('../lib/supabase');

      const offset = (page - 1) * PAGE_SIZE;
      const { orders, total } = await clientService.getClientOrders({
        company,
        limit: PAGE_SIZE,
        offset,
      });

      set({
        clientOrders: orders,
        clientOrdersTotal: total,
        clientOrdersLoading: false,
      });
    } catch (error) {
      console.error('Failed to load client orders:', error);
      set({
        clientOrders: [],
        clientOrdersTotal: 0,
        clientOrdersError: error instanceof Error ? error.message : 'Failed to load orders',
        clientOrdersLoading: false,
      });
    }
  },

  setClientOrdersPage: (page: number) => {
    const { selectedClient, loadClientOrders } = get();
    if (selectedClient) {
      loadClientOrders(selectedClient.company, page);
    }
  },

  clearClientDetail: () => {
    set({
      selectedClient: null,
      clientOrders: [],
      clientOrdersTotal: 0,
      clientOrdersPage: 1,
      clientOrdersLoading: false,
      clientOrdersError: null,
    });
  },
}));
