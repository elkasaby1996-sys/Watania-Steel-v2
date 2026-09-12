import { create } from 'zustand';
import { orderService, activityService, historyService, supabase, ensureOrderClientSite, verifyHistoryOrderClientLink, type Order as DBOrder, type Activity as DBActivity, type HistoryOrder } from '../lib/supabase';
import { roundTo3Decimals } from '../lib/utils';
import { logger } from '../lib/logger';
import { normalizeOrderType } from '../lib/orderTypes';
import { invalidateAnalyticsCache } from '../lib/steelAnalytics';

// Transform database types to frontend types
interface Order {
  id: string;
  customerName: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  tons: number;
  shift: 'morning' | 'night';
  deliveryNumber?: string;
  company?: string;
  site?: string;
  clientId?: string | null;
  siteId?: string | null;
  driverName?: string;
  phoneNumber?: string;
  deliveredAt?: string;
  signedDeliveryNote?: boolean;
  orderType?: 'straight-bar' | 'cut-and-bend';
  breakdown?: {
    '8mm': number;
    '10mm': number;
    '12mm': number;
    '14mm': number;
    '16mm': number;
    '18mm': number;
    '20mm': number;
    '25mm': number;
    '32mm': number;
  };
}

// Helper function to transform DB orders to frontend format
const dbToFrontend = (dbOrder: DBOrder): Order => {
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

// Helper function to transform frontend orders to DB format
const frontendToDb = (order: Order): any => {
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

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getOrderDate = (order: Pick<Order, 'date'>) => String(order.date || '').split('T')[0];

const isCurrentActiveOrder = (order: Order) => {
  const orderDate = getOrderDate(order);
  return Boolean(orderDate) && orderDate <= getTodayDate() && order.status !== 'delivered';
};

interface DashboardStats {
  todayOrders: number;
  inProgress: number;
  completed: number;
  delayed: number;
  delivered: number;
}

interface DashboardMetrics {
  todayOrders: number;
  cutAndBendTons: number;
  straightBarTons: number;
  totalTons: number;
  signedOrders: number;
  totalOrders: number;
  steelMix: {
    '8mm': number;
    '10mm': number;
    '12mm': number;
    '14mm': number;
    '16mm': number;
    '18mm': number;
    '20mm': number;
    '25mm': number;
    '32mm': number;
  };
}

function summarizeOrders(orders: Order[], delivered: number) {
  const current = orders.filter(isCurrentActiveOrder);
  const dashboardMetrics: DashboardMetrics = {
    todayOrders: current.length, totalOrders: current.length, cutAndBendTons: 0,
    straightBarTons: 0, totalTons: 0, signedOrders: 0,
    steelMix: { '8mm': 0, '10mm': 0, '12mm': 0, '14mm': 0, '16mm': 0, '18mm': 0, '20mm': 0, '25mm': 0, '32mm': 0 },
  };
  for (const order of current) {
    const tons = Number(order.tons) || 0;
    dashboardMetrics.totalTons += tons;
    if (normalizeOrderType(order.orderType) === 'cut-and-bend') dashboardMetrics.cutAndBendTons += tons;
    else dashboardMetrics.straightBarTons += tons;
    if (order.signedDeliveryNote) dashboardMetrics.signedOrders++;
    if (order.status === 'in-progress' || order.status === 'delayed') {
      for (const diameter of Object.keys(dashboardMetrics.steelMix) as Array<keyof DashboardMetrics['steelMix']>) {
        dashboardMetrics.steelMix[diameter] += Number(order.breakdown?.[diameter]) || 0;
      }
    }
  }
  return { dashboardMetrics, stats: {
    todayOrders: current.length, delivered,
    inProgress: current.filter(order => order.status === 'in-progress').length,
    completed: current.filter(order => order.status === 'completed').length,
    delayed: current.filter(order => order.status === 'delayed').length,
  } };
}

type LoadOptions = { force?: boolean };
let ordersRequest: Promise<void> | null = null;
let ordersController: AbortController | null = null;
let dataRevision = 0;
let sessionRevision = 0;
let historyRequest: Promise<void> | null = null;

interface ActivityItem {
  id: string;
  type: 'order_created' | 'order_updated' | 'order_completed';
  message: string;
  timestamp: string;
}

interface DashboardState {
  sidebarCollapsed: boolean;
  orders: Order[];
  historyOrders: HistoryOrder[];
  stats: DashboardStats;
  dashboardMetrics: DashboardMetrics;
  activities: ActivityItem[];
  searchQuery: string;
  loading: boolean;
  isLoadingOrders: boolean;
  ordersError: string | null;
  isLoadingMetrics: boolean;
  metricsError: string | null;
  error: string | null;
  hasLoadedOrders: boolean;
  ordersLoadedAt: number;
  ordersLoadedDate: string;
  isRefreshingOrders: boolean;
  refreshError: string | null;
  resetSessionData: () => void;
  invalidateOrders: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchQuery: (query: string) => void;
  loadOrders: (options?: LoadOptions) => Promise<void>;
  loadHistoryOrders: () => Promise<void>;
  loadActivities: () => Promise<void>;
  loadDashboardMetrics: (options?: LoadOptions) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  markAsDelivered: (orderId: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getTodayOrders: () => Order[];
  getDeliveredOrders: () => HistoryOrder[];
  getFilteredTodayOrders: () => Order[];
  getFilteredDeliveredOrders: (searchTerm?: string) => HistoryOrder[];
  getDeliveredOrdersByDate: (searchTerm?: string) => { [date: string]: HistoryOrder[] };
  getDailyMetrics: (searchTerm?: string) => { [date: string]: { straightBar: number; cutAndBend: number; total: number } };
  updateHistoryOrder: (order: HistoryOrder) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  sidebarCollapsed: false,
  searchQuery: '',
  orders: [],
  historyOrders: [],
  stats: {
    todayOrders: 0,
    inProgress: 0,
    completed: 0,
    delayed: 0,
    delivered: 0
  },
  dashboardMetrics: {
    todayOrders: 0,
    cutAndBendTons: 0,
    straightBarTons: 0,
    totalTons: 0,
    signedOrders: 0,
    totalOrders: 0,
    steelMix: {
      '8mm': 0,
      '10mm': 0,
      '12mm': 0,
      '14mm': 0,
      '16mm': 0,
      '18mm': 0,
      '20mm': 0,
      '25mm': 0,
      '32mm': 0,
    }
  },
  activities: [],
  loading: false,
  isLoadingOrders: false,
  ordersError: null,
  isLoadingMetrics: false,
  metricsError: null,
  error: null,
  hasLoadedOrders: false,
  ordersLoadedAt: 0,
  ordersLoadedDate: '',
  isRefreshingOrders: false,
  refreshError: null,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  loadOrders: (options = {}) => {
    if (ordersRequest) return ordersRequest;
    const state = get();
    if (options.force === false && state.hasLoadedOrders &&
        state.ordersLoadedDate === getTodayDate() && Date.now() - state.ordersLoadedAt < 30_000) {
      return Promise.resolve();
    }
    const revision = dataRevision;
    const controller = new AbortController();
    ordersController = controller;
    set({ isLoadingOrders: !state.hasLoadedOrders, isLoadingMetrics: !state.hasLoadedOrders,
      isRefreshingOrders: state.hasLoadedOrders, ordersError: null, metricsError: null, refreshError: null });
    const request = (async () => {
      try {
        const dbOrders = await orderService.getActive(controller.signal);
        const deliveredIds = await historyService.getDeliveredOrderIds(dbOrders.map(order => order.id), controller.signal);
        if (revision !== dataRevision || controller.signal.aborted) return;
        const orders = dbOrders.filter(order => !deliveredIds.has(String(order.id))).map(dbToFrontend);
        set({ orders, ...summarizeOrders(orders, get().stats.delivered), hasLoadedOrders: true,
          ordersLoadedAt: Date.now(), ordersLoadedDate: getTodayDate() });
      } catch (error) {
        if (revision !== dataRevision || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Failed to load orders';
        set(get().hasLoadedOrders ? { refreshError: message } : { ordersError: message, metricsError: message });
      } finally {
        if (revision === dataRevision) {
          ordersRequest = null;
          ordersController = null;
          set({ isLoadingOrders: false, isLoadingMetrics: false, isRefreshingOrders: false });
        }
      }
    })();
    ordersRequest = request;
    return request;
  },

  resetSessionData: () => {
    sessionRevision++;
    historyRequest = null;
    get().invalidateOrders();
    set({ orders: [], historyOrders: [], activities: [], ...summarizeOrders([], 0),
      hasLoadedOrders: false, ordersLoadedAt: 0, ordersLoadedDate: '',
      isLoadingOrders: false, isLoadingMetrics: false, isRefreshingOrders: false,
      ordersError: null, metricsError: null, refreshError: null, error: null, searchQuery: '' });
  },

  invalidateOrders: () => {
    invalidateAnalyticsCache();
    dataRevision++;
    ordersController?.abort();
    ordersController = null;
    ordersRequest = null;
    set({ ordersLoadedAt: 0, isLoadingOrders: false, isLoadingMetrics: false, isRefreshingOrders: false });
  },

  loadHistoryOrders: () => {
    if (historyRequest) return historyRequest;
    const revision = sessionRevision;
    historyRequest = (async () => {
      try {
        const historyOrders = await historyService.getAll();
        if (revision !== sessionRevision) return;
        set(state => ({ historyOrders, stats: { ...state.stats, delivered: historyOrders.length } }));
      } catch (error) {
        if (revision === sessionRevision) set({ error: error instanceof Error ? error.message : 'Failed to load history' });
      } finally {
        if (revision === sessionRevision) historyRequest = null;
      }
    })();
    return historyRequest;
  },

  loadActivities: async () => {
    const revision = sessionRevision;
    try {
      const dbActivities = await activityService.getRecent(10);
      if (revision !== sessionRevision) return;
      const activities = dbActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        timestamp: activity.timestamp
      }));
      set({ activities });
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  },

  // Compatibility entry point: totals and rows always share one request and snapshot.
  loadDashboardMetrics: (options) => get().loadOrders(options),

  updateOrderStatus: async (orderId, status) => {
    try {
      if (status === 'delivered') {
        const order = get().orders.find(o => String(o.id) === String(orderId));
        if (order) {
          await historyService.moveOrderToHistory(order);
          get().invalidateOrders();
          await get().loadOrders();
        }
      } else {
        const updateData = { status };
        await orderService.update(orderId, updateData);
        get().invalidateOrders();
        await get().loadOrders();
      }

      await activityService.create({
        type: 'order_updated',
        message: `Order ${orderId} status updated to ${status}`
      });
      get().loadActivities();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update order status' });
    }
  },

  markAsDelivered: async (orderId) => {
    try {
      const order = get().orders.find(o => String(o.id) === String(orderId));
      if (!order) {
        throw new Error('Order not found');
      }
      
      await historyService.moveOrderToHistory(order);
      get().invalidateOrders();

      // Remove from dashboard immediately so delivered orders are never visible in active table.
      set(state => {
        const orders = state.orders.filter(o => String(o.id) !== String(orderId));
        const todayOrders = orders.filter(isCurrentActiveOrder);
        return {
          orders,
          dashboardMetrics: summarizeOrders(orders, state.stats.delivered).dashboardMetrics,
          stats: {
            ...state.stats,
            todayOrders: todayOrders.length,
            inProgress: todayOrders.filter(o => o.status === 'in-progress').length,
            completed: todayOrders.filter(o => o.status === 'completed').length,
            delayed: todayOrders.filter(o => o.status === 'delayed').length
          }
        };
      });

      // Refresh in background to keep active/history data fully in sync with DB.
      await get().loadOrders();

      await activityService.create({
        type: 'order_completed',
        message: `Order ${orderId} has been marked as delivered`
      });
      get().loadActivities();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark order as delivered';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  addOrder: async (order) => {
    set({ loading: true, error: null });
    
    try {
      const dbOrder = frontendToDb(order);
      
      if (order.status === 'delivered') {
        const deliveredAt = order.deliveredAt || (order.date ? `${order.date}T00:00:00.000Z` : new Date().toISOString());
        const deliveredDate = String(deliveredAt).split('T')[0];
        const { clientId, siteId } = await ensureOrderClientSite({
          clientId: order.clientId,
          siteId: order.siteId,
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
        
        const { data: historyOrder, error: historyError } = await supabase
          .from('history_orders')
          .upsert([historyOrderData])
          .select()
          .single();
        
        if (historyError) {
          throw new Error(`Failed to create order in history: ${historyError.message}`);
        }

        await verifyHistoryOrderClientLink(order.id);
        
        set(state => ({
          historyOrders: [historyOrder, ...state.historyOrders.filter(h => h.id !== order.id)],
          stats: {
            ...state.stats,
            delivered: state.stats.delivered + 1
          },
          loading: false
        }));
      } else {
        const createdOrder = await orderService.create(dbOrder);
        get().invalidateOrders();
        const newOrder = dbToFrontend(createdOrder);
        
        set(state => {
          const orders = [newOrder, ...state.orders];
          const todayOrders = orders.filter(isCurrentActiveOrder);
          const stats = {
            todayOrders: todayOrders.length,
            inProgress: todayOrders.filter(o => o.status === 'in-progress').length,
            completed: todayOrders.filter(o => o.status === 'completed').length,
            delayed: todayOrders.filter(o => o.status === 'delayed').length,
            delivered: state.stats.delivered
          };
          return { orders, stats, dashboardMetrics: summarizeOrders(orders, stats.delivered).dashboardMetrics, loading: false };
        });
      }

      try {
        await activityService.create({
          type: 'order_created',
          message: `New order ${order.id} created for ${order.customerName}`
        });
        get().loadActivities();
      } catch (activityError) {
        console.warn('Failed to create activity:', activityError);
      }
    } catch (error) {
      console.error('Failed to add order:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create order',
        loading: false 
      });
      throw error;
    }
  },

  updateOrder: async (updatedOrder) => {
    try {
      logger.debug('🔄 Store: Updating ACTIVE order:', updatedOrder.id, 'status:', updatedOrder.status);
      
      if (updatedOrder.status === 'delivered') {
        logger.debug('📤 Status changed to delivered, moving to history');
        await historyService.moveOrderToHistory(updatedOrder);
        get().invalidateOrders();
        await get().loadOrders();
      } else {
        logger.debug('📝 Updating in active orders');
        const dbOrder = frontendToDb(updatedOrder);
        await orderService.update(updatedOrder.id, dbOrder);
        get().invalidateOrders();
        await get().loadOrders();
      }

      try {
        await activityService.create({
          type: 'order_updated',
          message: `Order ${updatedOrder.id} has been updated`
        });
        get().loadActivities();
      } catch (activityError) {
        console.warn('Failed to create activity:', activityError);
      }
    } catch (error) {
      console.error('❌ Store: Failed to update active order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update active order';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteOrder: async (orderId) => {
    try {
      await orderService.delete(orderId);
      get().invalidateOrders();
      
      set(state => {
        const orders = state.orders.filter(order => order.id !== orderId);
        const todayOrders = orders.filter(isCurrentActiveOrder);
        const stats = {
          todayOrders: todayOrders.length,
          inProgress: todayOrders.filter(o => o.status === 'in-progress').length,
          completed: todayOrders.filter(o => o.status === 'completed').length,
          delayed: todayOrders.filter(o => o.status === 'delayed').length,
          delivered: state.stats.delivered
        };
        return { orders, stats, dashboardMetrics: summarizeOrders(orders, stats.delivered).dashboardMetrics };
      });

      await activityService.create({
        type: 'order_updated',
        message: `Order ${orderId} has been deleted`
      });
      get().loadActivities();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete order' });
    }
  },

  getTodayOrders: () => {
    return get().orders.filter(isCurrentActiveOrder);
  },

  getDeliveredOrders: () => {
    try {
      const historyOrders = get().historyOrders || [];
      
      return historyOrders.filter(order => order && order.id).sort((a, b) => {
        try {
          const dateA = new Date(a.delivered_at || a.date);
          const dateB = new Date(b.delivered_at || b.date);
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting orders:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Error getting delivered orders:', error);
      return [];
    }
  },

  getFilteredTodayOrders: () => {
    const { searchQuery } = get();
    const todayOrders = get().getTodayOrders();
    
    if (!searchQuery.trim()) return todayOrders;
    
    const searchTerm = searchQuery.toLowerCase();
    return todayOrders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm) ||
      (order.company && order.company.toLowerCase().includes(searchTerm)) ||
      (order.site && order.site.toLowerCase().includes(searchTerm)) ||
      (order.driverName && order.driverName.toLowerCase().includes(searchTerm)) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchTerm)) ||
      (order.deliveryNumber && order.deliveryNumber.toLowerCase().includes(searchTerm))
    );
  },

  getFilteredDeliveredOrders: (searchTerm?: string) => {
    try {
      const deliveredOrders = get().getDeliveredOrders();
      const query = searchTerm || get().searchQuery;
      
      if (!query.trim()) return deliveredOrders;
      
      const search = query.toLowerCase();
      return deliveredOrders.filter(order => {
        if (!order) return false;
        
        return (
          (order.id && order.id.toLowerCase().includes(search)) ||
          (order.customer_name && order.customer_name.toLowerCase().includes(search)) ||
          (order.company && order.company.toLowerCase().includes(search)) ||
          (order.site && order.site.toLowerCase().includes(search)) ||
          (order.driver_name && order.driver_name.toLowerCase().includes(search)) ||
          (order.phone_number && order.phone_number.toLowerCase().includes(search)) ||
          (order.delivery_number && order.delivery_number.toLowerCase().includes(search))
        );
      });
    } catch (error) {
      console.error('Error filtering delivered orders:', error);
      return [];
    }
  },

  getDeliveredOrdersByDate: (searchTerm?: string) => {
    try {
      const filteredOrders = get().getFilteredDeliveredOrders(searchTerm);
      const groupedOrders: { [date: string]: HistoryOrder[] } = {};
      
      filteredOrders.forEach(order => {
        if (!order) return;
        const orderDateTime = order.date || order.delivered_at;
        if (!orderDateTime) return;
        const orderDate = String(orderDateTime).split('T')[0];
        
        if (!groupedOrders[orderDate]) {
          groupedOrders[orderDate] = [];
        }
        groupedOrders[orderDate].push(order);
      });
      
      Object.keys(groupedOrders).forEach(date => {
        try {
          groupedOrders[date].sort((a, b) => {
            const timeA = new Date(a.date || a.delivered_at).getTime();
            const timeB = new Date(b.date || b.delivered_at).getTime();
            return timeB - timeA;
          });
        } catch (error) {
          console.error('Error sorting orders for date:', date, error);
        }
      });
      
      return groupedOrders;
    } catch (error) {
      console.error('Error grouping delivered orders by date:', error);
      return {};
    }
  },

  getDailyMetrics: (searchTerm?: string) => {
    const deliveredOrdersByDate = get().getDeliveredOrdersByDate(searchTerm);
    const metrics: { [date: string]: { straightBar: number; cutAndBend: number; total: number } } = {};
    
    Object.entries(deliveredOrdersByDate).forEach(([date, orders]) => {
      let straightBar = 0;
      let cutAndBend = 0;
      
      orders.forEach(order => {
        const tons = order.tons || 0;
        const orderType = normalizeOrderType(order.order_type);
        
        if (orderType === 'cut-and-bend') {
          cutAndBend += tons;
        } else {
          straightBar += tons;
        }
      });
      
      metrics[date] = {
        straightBar: roundTo3Decimals(straightBar),
        cutAndBend: roundTo3Decimals(cutAndBend),
        total: roundTo3Decimals(straightBar + cutAndBend)
      };
    });
    
    return metrics;
  },

  updateHistoryOrder: async (order: HistoryOrder) => {
    try {
      logger.debug('🔄 Store: Updating history order:', order.id, 'status:', order.status);
      
      if (order.status === 'in-progress') {
        logger.debug('📤 Store: Moving order back to active orders');
        
        await historyService.moveOrderToActive(order);
        get().invalidateOrders();
        
        set(state => ({
          historyOrders: state.historyOrders.filter(o => o.id !== order.id),
          stats: {
            ...state.stats,
            delivered: Math.max(0, state.stats.delivered - 1)
          }
        }));
        
        setTimeout(async () => {
          try {
            await get().loadOrders();
          } catch (loadError) {
            console.error('Failed to reload active orders:', loadError);
          }
        }, 500);
        
        try {
          await activityService.create({
            type: 'order_updated',
            message: `Order ${order.id} moved back to active orders`
          });
          get().loadActivities();
        } catch (activityError) {
          console.warn('Failed to create activity:', activityError);
        }
      } else {
        logger.debug('📝 Store: Updating order in history');
        
        const updatedOrder = await historyService.update(order.id, order);
        
        set(state => ({
          historyOrders: state.historyOrders.map(o => o.id === order.id ? updatedOrder : o)
        }));
        
        try {
          await activityService.create({
            type: 'order_updated',
            message: `History order ${order.id} has been updated`
          });
          get().loadActivities();
        } catch (activityError) {
          console.warn('Failed to create activity:', activityError);
        }
      }
    } catch (error) {
      console.error('❌ Store: Failed to update history order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update history order';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  }
}));

if (import.meta.hot) {
  import.meta.hot.dispose(() => useDashboardStore.getState().resetSessionData());
}
