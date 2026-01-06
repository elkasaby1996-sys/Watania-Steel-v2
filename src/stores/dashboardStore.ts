import { create } from 'zustand';
import { orderService, activityService, historyService, supabase, type Order as DBOrder, type Activity as DBActivity, type HistoryOrder } from '../lib/supabase';
import { roundTo3Decimals } from '../lib/utils';
import { fetchQuery, getQueryData, invalidateQueries, setQueryData } from '../lib/queryCache';
import { queryKeys } from '../lib/queryKeys';
import { fetchActiveOrders, fetchActivities, fetchHistoryOrders } from '../lib/dataFetchers';

// Transform database types to frontend types
interface Order {
  id: string;
  customerName: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  amount: number;
  tons: number;
  shift: 'morning' | 'night';
  deliveryNumber?: string;
  company?: string;
  site?: string;
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
    amount: dbOrder.amount,
    tons: dbOrder.tons,
    shift: dbOrder.shift,
    deliveryNumber: dbOrder.delivery_number || dbOrder.id,
    company: dbOrder.company,
    site: dbOrder.site,
    driverName: dbOrder.driver_name,
    phoneNumber: dbOrder.phone_number,
    deliveredAt: dbOrder.delivered_at,
    signedDeliveryNote: dbOrder.signed_delivery_note || false,
    orderType: dbOrder.order_type || 'straight-bar',
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
    amount: order.amount,
    tons: order.tons,
    shift: order.shift,
    delivery_number: order.deliveryNumber || order.id,
    company: order.company,
    site: order.site,
    driver_name: order.driverName,
    phone_number: order.phoneNumber,
    delivered_at: order.deliveredAt,
    signed_delivery_note: order.signedDeliveryNote || false,
    order_type: order.orderType || 'straight-bar',
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

interface DashboardStats {
  todayOrders: number;
  inProgress: number;
  completed: number;
  delayed: number;
  delivered: number;
}

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
  activities: ActivityItem[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchQuery: (query: string) => void;
  loadOrders: () => Promise<void>;
  loadHistoryOrders: () => Promise<void>;
  loadActivities: () => Promise<void>;
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
  activities: [],
  loading: false,
  error: null,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  loadOrders: async () => {
    set({ loading: true, error: null });
    try {
      const cacheKey = queryKeys.orders({ scope: 'active' });
      const cachedOrders = getQueryData<Order[]>(cacheKey);

      if (cachedOrders) {
        const stats = {
          todayOrders: cachedOrders.length,
          inProgress: cachedOrders.filter(o => o.status === 'in-progress').length,
          completed: cachedOrders.filter(o => o.status === 'completed').length,
          delayed: cachedOrders.filter(o => o.status === 'delayed').length,
          delivered: get().stats?.delivered || 0
        };
        set({ orders: cachedOrders, stats, loading: false });
      }

      const orders = await fetchQuery(cacheKey, fetchActiveOrders, { staleTime: 30000 });
      setQueryData(cacheKey, orders);
      set({ loading: false });
    } catch (error) {
      console.error('Failed to load orders:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load orders', loading: false });
    }
  },

  loadHistoryOrders: async () => {
    try {
      const cacheKey = queryKeys.historyOrders({ scope: 'delivered' });
      const cachedHistory = getQueryData<HistoryOrder[]>(cacheKey);

      if (cachedHistory) {
        set(state => ({
          historyOrders: cachedHistory,
          stats: {
            ...state.stats,
            delivered: cachedHistory.length
          }
        }));
      }

      const historyOrders = await fetchQuery(cacheKey, fetchHistoryOrders, { staleTime: 60000 });
      setQueryData(cacheKey, historyOrders);
    } catch (error) {
      console.error('Failed to load history orders:', error);
      set({ 
        historyOrders: [],
        error: error instanceof Error ? error.message : 'Failed to load history' 
      });
    }
  },

  loadActivities: async () => {
    try {
      const cacheKey = queryKeys.activities({ scope: 'recent' });
      const cachedActivities = getQueryData<ActivityItem[]>(cacheKey);

      if (cachedActivities) {
        set({ activities: cachedActivities });
      }

      const activities = await fetchQuery(cacheKey, fetchActivities, { staleTime: 30000 });
      setQueryData(cacheKey, activities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const ordersKey = queryKeys.orders({ scope: 'active' });
      const historyKey = queryKeys.historyOrders({ scope: 'delivered' });

      if (status === 'delivered') {
        const order = get().orders.find(o => o.id === orderId);
        if (order) {
          await historyService.moveOrderToHistory(order);
          
          set(state => {
            const orders = state.orders.filter(o => o.id !== orderId);
            const stats = {
              todayOrders: orders.length,
              inProgress: orders.length,
              completed: 0,
              delayed: 0,
              delivered: state.stats.delivered + 1
            };
            return { orders, stats };
          });
          
          setQueryData(ordersKey, get().orders);
          invalidateQueries(historyKey);
        }
      } else {
        const updateData = { status };
        set(state => ({
          orders: state.orders.map(order =>
            order.id === orderId ? { ...order, status } : order
          )
        }));
        await orderService.update(orderId, updateData);
        setQueryData(ordersKey, get().orders);
      }

      await activityService.create({
        type: 'order_updated',
        message: `Order ${orderId} status updated to ${status}`
      });
      invalidateQueries(queryKeys.activities({ scope: 'recent' }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update order status' });
      invalidateQueries(queryKeys.orders({ scope: 'active' }));
    }
  },

  markAsDelivered: async (orderId) => {
    try {
      const order = get().orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      await historyService.moveOrderToHistory(order);
      
      set(state => {
        const orders = state.orders.filter(o => o.id !== orderId);
        const stats = {
          todayOrders: orders.length,
          inProgress: orders.length,
          completed: 0,
          delayed: 0,
          delivered: state.stats.delivered + 1
        };
        return { orders, stats };
      });

      setQueryData(queryKeys.orders({ scope: 'active' }), get().orders);
      invalidateQueries(queryKeys.historyOrders({ scope: 'delivered' }));

      await activityService.create({
        type: 'order_completed',
        message: `Order ${orderId} has been marked as delivered`
      });
      invalidateQueries(queryKeys.activities({ scope: 'recent' }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to mark order as delivered' });
      invalidateQueries(queryKeys.orders({ scope: 'active' }));
      invalidateQueries(queryKeys.historyOrders({ scope: 'delivered' }));
    }
  },

  addOrder: async (order) => {
    set({ loading: true, error: null });
    
    try {
      const dbOrder = frontendToDb(order);
      const ordersKey = queryKeys.orders({ scope: 'active' });
      const historyKey = queryKeys.historyOrders({ scope: 'delivered' });
      
      if (order.status === 'delivered') {
        const historyOrderData = {
          id: order.id,
          customer_name: order.customerName,
          date: order.date,
          status: 'delivered',
          amount: order.amount || 0,
          tons: order.tons || 0,
          shift: order.shift || 'morning',
          delivery_number: order.deliveryNumber || order.id,
          company: order.company || '',
          site: order.site || '',
          driver_name: order.driverName || '',
          phone_number: order.phoneNumber || '',
          delivered_at: new Date().toISOString(),
          signed_delivery_note: order.signedDeliveryNote || false,
          order_type: order.orderType || 'straight-bar',
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
        
        set(state => ({
          historyOrders: [historyOrder, ...state.historyOrders.filter(h => h.id !== order.id)],
          stats: {
            ...state.stats,
            delivered: state.stats.delivered + 1
          },
          loading: false
        }));
        setQueryData(historyKey, get().historyOrders);
      } else {
        const optimisticOrder = dbToFrontend({ ...dbOrder });
        set(state => ({
          orders: [optimisticOrder, ...state.orders],
        }));
        setQueryData(ordersKey, get().orders);

        const createdOrder = await orderService.create(dbOrder);
        const newOrder = dbToFrontend(createdOrder);
        
        set(state => {
          const orders = [newOrder, ...state.orders];
          const stats = {
            todayOrders: orders.length,
            inProgress: orders.filter(o => o.status === 'in-progress').length,
            completed: orders.filter(o => o.status === 'completed').length,
            delayed: orders.filter(o => o.status === 'delayed').length,
            delivered: state.stats.delivered
          };
          return { orders, stats, loading: false };
        });
        setQueryData(ordersKey, get().orders);
      }

      try {
        await activityService.create({
          type: 'order_created',
          message: `New order ${order.id} created for ${order.customerName}`
        });
        invalidateQueries(queryKeys.activities({ scope: 'recent' }));
      } catch (activityError) {
        console.warn('Failed to create activity:', activityError);
      }
    } catch (error) {
      console.error('Failed to add order:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create order',
        loading: false 
      });
      invalidateQueries(queryKeys.orders({ scope: 'active' }));
      invalidateQueries(queryKeys.historyOrders({ scope: 'delivered' }));
      throw error;
    }
  },

  updateOrder: async (updatedOrder) => {
    try {
      console.log('🔄 Store: Updating ACTIVE order:', updatedOrder.id, 'status:', updatedOrder.status);
      const ordersKey = queryKeys.orders({ scope: 'active' });
      const historyKey = queryKeys.historyOrders({ scope: 'delivered' });
      
      if (updatedOrder.status === 'delivered') {
        console.log('📤 Status changed to delivered, moving to history');
        await historyService.moveOrderToHistory(updatedOrder);
        set(state => ({
          orders: state.orders.filter(order => order.id !== updatedOrder.id),
          historyOrders: state.historyOrders,
          stats: {
            ...state.stats,
            delivered: state.stats.delivered + 1
          }
        }));
        setQueryData(ordersKey, get().orders);
        invalidateQueries(historyKey);
      } else {
        console.log('📝 Updating in active orders');
        const dbOrder = frontendToDb(updatedOrder);
        set(state => ({
          orders: state.orders.map(order =>
            order.id === updatedOrder.id ? updatedOrder : order
          )
        }));
        setQueryData(ordersKey, get().orders);
        await orderService.update(updatedOrder.id, dbOrder);
      }

      try {
        await activityService.create({
          type: 'order_updated',
          message: `Order ${updatedOrder.id} has been updated`
        });
        invalidateQueries(queryKeys.activities({ scope: 'recent' }));
      } catch (activityError) {
        console.warn('Failed to create activity:', activityError);
      }
    } catch (error) {
      console.error('❌ Store: Failed to update active order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update active order';
      set({ error: errorMessage });
      invalidateQueries(queryKeys.orders({ scope: 'active' }));
      invalidateQueries(queryKeys.historyOrders({ scope: 'delivered' }));
      throw new Error(errorMessage);
    }
  },

  deleteOrder: async (orderId) => {
    const ordersKey = queryKeys.orders({ scope: 'active' });
    const previousOrders = get().orders;
    const previousStats = get().stats;

    try {
      const nextOrders = previousOrders.filter(order => order.id !== orderId);
      set({ orders: nextOrders });
      setQueryData(ordersKey, nextOrders);

      await orderService.delete(orderId);
      
      set(state => ({
        stats: {
          todayOrders: state.orders.length,
          inProgress: state.orders.filter(o => o.status === 'in-progress').length,
          completed: state.orders.filter(o => o.status === 'completed').length,
          delayed: state.orders.filter(o => o.status === 'delayed').length,
          delivered: state.stats.delivered
        }
      }));

      await activityService.create({
        type: 'order_updated',
        message: `Order ${orderId} has been deleted`
      });
      invalidateQueries(queryKeys.activities({ scope: 'recent' }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete order' });
      invalidateQueries(queryKeys.orders({ scope: 'active' }));
      set({ orders: previousOrders, stats: previousStats });
    }
  },

  getTodayOrders: () => {
    return get().orders.filter(order => order.status !== 'delivered');
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
        if (!order || !order.date) return;
        
        const orderDate = order.date;
        
        if (!groupedOrders[orderDate]) {
          groupedOrders[orderDate] = [];
        }
        groupedOrders[orderDate].push(order);
      });
      
      Object.keys(groupedOrders).forEach(date => {
        try {
          groupedOrders[date].sort((a, b) => {
            const timeA = new Date(a.delivered_at || a.date).getTime();
            const timeB = new Date(b.delivered_at || b.date).getTime();
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
        const orderType = order.order_type || 'straight-bar';
        
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
      console.log('🔄 Store: Updating history order:', order.id, 'status:', order.status);
      
      if (order.status === 'in-progress') {
        console.log('📤 Store: Moving order back to active orders');
        
        await historyService.moveOrderToActive(order);
        
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
        console.log('📝 Store: Updating order in history');
        
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
