import { driverService } from '../lib/supabase';
import { getQuerySession } from '../lib/queryCache';
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
  resetSessionData: () => void;
  hasLoaded: boolean;
  loadDrivers: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  addDriver: (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  getActiveDrivers: () => Driver[];
  getFilteredDrivers: () => Driver[];
  getCurrentCycleDates: () => { start: string; end: string };
}

let driversRevision = 0;
let driversRequest: Promise<void> | null = null;
let metricsRequest: Promise<void> | null = null;
export const useDriversStore = create<DriversState>((set, get) => ({
  drivers: [],
  metrics: [],
  hasLoaded: false,
  resetSessionData: () => { driversRevision++; driversRequest = null; metricsRequest = null;
    set({ drivers: [], metrics: [], loading: false, error: null, hasLoaded: false }); },
  loading: false,
  error: null,
  searchQuery: '',
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  loadDrivers: () => {
    if (driversRequest) return driversRequest;
    const session = getQuerySession();
    const revision = driversRevision;
    set({ loading: !get().hasLoaded, error: null });
    const request = (async () => {
      try {
        const drivers = await driverService.getAll();
        if (session === getQuerySession() && revision === driversRevision) set({ drivers, hasLoaded: true });
      } catch (error) {
        if (session === getQuerySession() && revision === driversRevision) set({ error: error instanceof Error ? error.message : 'Failed to load drivers' });
      } finally {
        if (session === getQuerySession() && revision === driversRevision) { driversRequest = null; set({ loading: false }); }
      }
    })();
    driversRequest = request;
    return request;
  },
  loadMetrics: () => {
    if (metricsRequest) return metricsRequest;
    const session = getQuerySession();
    const revision = driversRevision;
    const request = (async () => {
      try {
        await get().loadDrivers();
        if (session !== getQuerySession() || revision !== driversRevision || get().error) return;
        const metrics = await driverService.getMetrics(get().drivers);
        if (session === getQuerySession() && revision === driversRevision) set({ metrics });
      } catch (error) {
        if (session === getQuerySession() && revision === driversRevision) set({ error: error instanceof Error ? error.message : 'Failed to load metrics' });
      } finally { if (session === getQuerySession() && revision === driversRevision) metricsRequest = null; }
    })();
    metricsRequest = request;
    return request;
  },

  addDriver: async (driverData) => {
    set({ loading: true, error: null });
    try {
      const newDriver = await driverService.create(driverData);
      driversRevision++; driversRequest = null; metricsRequest = null;
      set({ loading: false });
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
      const updatedDriver = await driverService.update(id, updates);
      driversRevision++; driversRequest = null; metricsRequest = null;
      set({ loading: false });
      
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
      await driverService.delete(id);
      driversRevision++; driversRequest = null; metricsRequest = null;
      set({ loading: false });
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
