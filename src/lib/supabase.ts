import { createClient } from '@supabase/supabase-js'
import { getEnvVar } from './env'

// Get Supabase credentials from environment variables
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

// Create Supabase client with the actual credentials
export const supabase = createClient(
  supabaseUrl || 'https://lzjzdogiuxenlojeudjt.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6anpkb2dpdXhlbmxvamV1ZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTMyMjksImV4cCI6MjA3NDE4OTIyOX0.q3kAu-fEJbcYel_H8vxcc0RP3QxAWgCkTF6aqpSCZH4'
);

// Database types
export interface Order {
  id: string;
  customer_name: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  amount: number;
  tons: number;
  shift: 'morning' | 'night';
  delivery_number?: string;
  company?: string;
  site?: string;
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
  amount: number;
  tons: number;
  shift: 'morning' | 'night';
  delivery_number?: string;
  company?: string;
  site?: string;
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

// Helper functions to transform between DB and frontend formats
export const dbToFrontend = (dbOrder: Order): any => {
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

export const frontendToDb = (order: any): any => {
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

// Database operations
export const orderService = {
  async getAll(): Promise<Order[]> {
    try {
      console.log('Fetching all orders from database...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Raw data from database:', data);
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
      console.log('🔄 Service: Updating active order:', id, updates);
      
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
      
      console.log('✅ Active order updated successfully');
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
  async getAll(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "drivers" does not exist')) {
          console.warn('Drivers table does not exist yet.');
          return [];
        }
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      return [];
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

  async getById(id: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get driver by ID:', error);
      return null;
    }
  },

  async getDriverOrders(driverName: string, startDate?: string, endDate?: string): Promise<Order[]> {
    try {
      let activeQuery = supabase
        .from('orders')
        .select('*')
        .eq('driver_name', driverName)
        .order('date', { ascending: false });
      
      if (startDate) {
        activeQuery = activeQuery.gte('date', startDate);
      }
      
      if (endDate) {
        activeQuery = activeQuery.lte('date', endDate);
      }
      
      const { data: activeOrders } = await activeQuery;
      
      let historyQuery = supabase
        .from('history_orders')
        .select('*')
        .eq('driver_name', driverName)
        .order('date', { ascending: false });
      
      if (startDate) {
        historyQuery = historyQuery.gte('date', startDate);
      }
      
      if (endDate) {
        historyQuery = historyQuery.lte('date', endDate);
      }
      
      const { data: historyOrders } = await historyQuery;
      
      const allOrders = [
        ...(activeOrders || []),
        ...(historyOrders || [])
      ];
      
      allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return allOrders || [];
    } catch (error) {
      console.error('Failed to fetch driver orders:', error);
      return [];
    }
  },

  async getDriverMetricsForDateRange(driverName: string, startDate: string, endDate: string): Promise<any> {
    try {
      const orders = await this.getDriverOrders(driverName, startDate, endDate);
      
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'delivered').length;
      const pendingOrders = orders.filter(o => o.status === 'in-progress').length;
      const totalTons = orders.reduce((sum, o) => sum + (Number(o.tons) || 0), 0);
      
      return {
        total_orders: totalOrders,
        completed_orders: completedOrders,
        pending_orders: pendingOrders,
        total_tons: Math.round(totalTons * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get driver metrics for date range:', error);
      return {
        total_orders: 0,
        completed_orders: 0,
        pending_orders: 0,
        total_tons: 0
      };
    }
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

  async getMetrics(): Promise<DriverMetrics[]> {
    try {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let cycleStart: Date;
      let cycleEnd: Date;
      
      if (currentDay >= 25) {
        cycleStart = new Date(currentYear, currentMonth, 25);
        cycleEnd = new Date(currentYear, currentMonth + 1, 25, 23, 59, 59);
      } else {
        cycleStart = new Date(currentYear, currentMonth - 1, 25);
        cycleEnd = new Date(currentYear, currentMonth, 25, 23, 59, 59);
      }
      
      const cycleStartStr = cycleStart.toISOString().split('T')[0];
      const cycleEndStr = cycleEnd.toISOString().split('T')[0];
      
      let drivers: Driver[] = [];
      try {
        drivers = await this.getAll();
      } catch (error) {
        console.warn('Drivers table may not exist yet, returning empty metrics');
        return [];
      }
      
      const metricsPromises = drivers.map(async (driver) => {
        try {
          let { data: activeOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('driver_name', driver.name)
            .gte('date', cycleStartStr)
            .lte('date', cycleEndStr);
          
          let { data: historyOrders } = await supabase
            .from('history_orders')
            .select('*')
            .eq('driver_name', driver.name)
            .gte('date', cycleStartStr)
            .lte('date', cycleEndStr);
          
          const allDriverOrders = [
            ...(activeOrders || []),
            ...(historyOrders || [])
          ];
          
          const totalOrders = allDriverOrders.length || 0;
          const completedOrders = allDriverOrders.filter(o => o.status === 'delivered').length || 0;
          const pendingOrders = allDriverOrders.filter(o => o.status !== 'delivered').length || 0;
          const totalTons = allDriverOrders.reduce((sum, o) => sum + (Number(o.tons) || 0), 0) || 0;
          
          return {
            driver_id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone_number,
            is_active: driver.is_active,
            total_orders: totalOrders,
            completed_orders: completedOrders,
            pending_orders: pendingOrders,
            total_tons: Math.round(totalTons * 100) / 100,
            cycle_start: cycleStartStr,
            cycle_end: cycleEndStr
          };
        } catch (error) {
          console.error('Error processing driver metrics:', driver.name, error);
          return {
            driver_id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone_number,
            is_active: driver.is_active,
            total_orders: 0,
            completed_orders: 0,
            pending_orders: 0,
            total_tons: 0,
            cycle_start: cycleStartStr,
            cycle_end: cycleEndStr
          };
        }
      });
      
      const metrics = await Promise.all(metricsPromises);
      return metrics;
    } catch (error) {
      console.error('❌ Failed to fetch driver metrics:', error);
      return [];
    }
  }
};

export const historyService = {
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

  async moveOrderToHistory(order: any): Promise<void> {
    try {
      console.log('🔄 Moving order to history:', order.id);
      
      const { data: existingHistory } = await supabase
        .from('history_orders')
        .select('id')
        .eq('id', order.id)
        .single();
      
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
      
      if (existingHistory) {
        await supabase
          .from('history_orders')
          .update(historyOrderData)
          .eq('id', order.id);
      } else {
        await supabase
          .from('history_orders')
          .insert([historyOrderData]);
      }
      
      await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);
      
      console.log('✅ Order moved to history successfully');
    } catch (error) {
      console.error('❌ Failed to move order to history:', error);
      throw error;
    }
  },

  async moveOrderToActive(order: any): Promise<void> {
    try {
      console.log('🔄 Service: Moving order back to active:', order.id);
      
      const activeOrderData = {
        id: order.id,
        customer_name: order.customer_name,
        date: order.date,
        status: 'in-progress',
        amount: order.amount || 0,
        tons: order.tons || 0,
        shift: order.shift || 'morning',
        delivery_number: order.delivery_number || order.id,
        company: order.company || '',
        site: order.site || '',
        driver_name: order.driver_name || '',
        phone_number: order.phone_number || '',
        delivered_at: null,
        signed_delivery_note: order.signed_delivery_note || false,
        order_type: order.order_type || 'straight-bar',
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
      
      console.log('✅ Service: Order moved back to active successfully');
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
      
      const updateData: any = {
        ...updates,
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
