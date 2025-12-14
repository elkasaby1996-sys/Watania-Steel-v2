import { create } from 'zustand';

// Define types locally to avoid import issues
interface Driver {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DriverMetrics {
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

interface DriversState {
  drivers: Driver[];
  metrics: DriverMetrics[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadDrivers: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  addDriver: (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  getActiveDrivers: () => Driver[];
  getFilteredDrivers: () => Driver[];
  getCurrentCycleDates: () => { start: string; end: string };
}

export const useDriversStore = create<DriversState>((set, get) => ({
  drivers: [],
  metrics: [],
  loading: false,
  error: null,
  searchQuery: '',
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  loadDrivers: async () => {
    set({ loading: true, error: null });
    try {
      // Import dynamically to avoid circular dependencies
      const { driverService } = await import('../lib/supabase');
      const drivers = await driverService.getAll();
      set({ drivers, loading: false });
    } catch (error) {
      console.error('Failed to load drivers:', error);
      set({ 
        drivers: [], // Set empty array on error
        error: error instanceof Error ? error.message : 'Failed to load drivers', 
        loading: false 
      });
    }
  },
  
  loadMetrics: async () => {
    try {
      const { driverService } = await import('../lib/supabase');
      const metrics = await driverService.getMetrics();
      set({ metrics });
    } catch (error) {
      console.error('Failed to load driver metrics:', error);
      set({ 
        metrics: [], // Set empty array on error
        error: error instanceof Error ? error.message : 'Failed to load metrics' 
      });
    }
  },
  
  addDriver: async (driverData) => {
    set({ loading: true, error: null });
    try {
      const { driverService } = await import('../lib/supabase');
      const newDriver = await driverService.create(driverData);
      set(state => ({
        drivers: [newDriver, ...state.drivers],
        loading: false
      }));
      // Reload metrics to include new driver
      get().loadMetrics();
    } catch (error) {
      console.error('Failed to add driver:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create driver',
        loading: false 
      });
      throw error;
    }
  },
  
  updateDriver: async (id, updates) => {
    try {
      const { driverService } = await import('../lib/supabase');
      const updatedDriver = await driverService.update(id, updates);
      
      // Update the driver in the store
      set(state => ({
        drivers: state.drivers.map(d => d.id === id ? updatedDriver : d),
        metrics: state.metrics.map(m => 
          m && m.driver_id === id 
            ? { ...m, driver_name: updatedDriver.name, phone_number: updatedDriver.phone_number, is_active: updatedDriver.is_active }
            : m
        ),
        error: null
      }));
      
    } catch (error) {
      console.error('Failed to update driver:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update driver' });
      throw error;
    }
  },
  
  deleteDriver: async (id) => {
    try {
      const { driverService } = await import('../lib/supabase');
      await driverService.delete(id);
      set(state => ({
        drivers: state.drivers.filter(d => d.id !== id),
        metrics: state.metrics.filter(m => m.driver_id !== id)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete driver' });
      throw error;
    }
  },
  
  getActiveDrivers: () => {
    return get().drivers.filter(driver => driver.is_active);
  },
  
  getFilteredDrivers: () => {
    const { drivers, searchQuery } = get();
    if (!searchQuery.trim()) return drivers;
    
    const search = searchQuery.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(search) ||
      driver.phone_number.toLowerCase().includes(search)
    );
  },
  
  getCurrentCycleDates: () => {
    try {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let cycleStart: Date;
      let cycleEnd: Date;
      
      if (currentDay >= 25) {
        // We're in the current month's cycle
        cycleStart = new Date(currentYear, currentMonth, 25);
        cycleEnd = new Date(currentYear, currentMonth + 1, 24);
      } else {
        // We're in the previous month's cycle
        cycleStart = new Date(currentYear, currentMonth - 1, 25);
        cycleEnd = new Date(currentYear, currentMonth, 24);
      }
      
      return {
        start: cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        end: cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    } catch (error) {
      console.error('Error calculating cycle dates:', error);
      return { start: 'N/A', end: 'N/A' };
    }
  }
}));
