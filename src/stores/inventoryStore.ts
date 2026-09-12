import { inventoryService } from '../lib/supabase';
import { getQuerySession } from '../lib/queryCache';
import { create } from 'zustand';

// Define inventory data types
export interface InventoryData {
  qatar_steel: Record<string, any>[];
  al_watania_steel: Record<string, any>[];
  special_length: Record<string, any>[];
  coils: Record<string, any>[];
  wire: Record<string, any>[];
  coupler: Record<string, any>[];
}

export type InventoryTableName = keyof InventoryData;

interface InventoryState {
  data: InventoryData;
  loading: boolean;
  error: string | null;
  loadingTable: InventoryTableName | null;

  resetSessionData: () => void;
  hasLoaded: boolean;
  // Actions
  loadAllInventory: () => Promise<void>;
  loadTableData: (tableName: InventoryTableName) => Promise<void>;
  updateTableData: (
    tableName: InventoryTableName,
    updates: Array<{ id: string | number; data: Record<string, any>; idColumn?: string }>
  ) => Promise<void>;
  setError: (error: string | null) => void;
}

const initialData: InventoryData = {
  qatar_steel: [],
  al_watania_steel: [],
  special_length: [],
  coils: [],
  wire: [],
  coupler: [],
};

let inventoryRevision = 0;
let inventoryRequest: Promise<void> | null = null;
export const useInventoryStore = create<InventoryState>((set, get) => ({
  data: initialData,
  hasLoaded: false,
  resetSessionData: () => { inventoryRevision++; inventoryRequest = null;
    set({ data: initialData, hasLoaded: false, loading: false, loadingTable: null, error: null }); },
  loading: false,
  error: null,
  loadingTable: null,

  loadAllInventory: () => {
    if (inventoryRequest) return inventoryRequest;
    const session = getQuerySession();
    const revision = inventoryRevision;
    set({ loading: !get().hasLoaded, error: null });
    const request = (async () => {
      try {
        await Promise.all((Object.keys(initialData) as InventoryTableName[]).map(async table => {
          try {
            const rows = await inventoryService.getTableData(table);
            if (session === getQuerySession() && revision === inventoryRevision) set(state => ({ data: { ...state.data, [table]: rows } }));
          } catch (error) {
            if (session === getQuerySession() && revision === inventoryRevision) set({ error: error instanceof Error ? error.message : 'Failed to load inventory' });
          }
        }));
        if (session === getQuerySession() && revision === inventoryRevision) set({ hasLoaded: true });
      } finally {
        if (session === getQuerySession() && revision === inventoryRevision) { inventoryRequest = null; set({ loading: false }); }
      }
    })();
    inventoryRequest = request;
    return request;
  },

  loadTableData: async (tableName: InventoryTableName) => {
    const session = getQuerySession();
    const revision = inventoryRevision;
    set({ loadingTable: tableName, error: null });
    try {
      const tableData = await inventoryService.getTableData(tableName);
      if (session !== getQuerySession() || revision !== inventoryRevision) return;
      set(state => ({
        data: {
          ...state.data,
          [tableName]: tableData,
        },
        loadingTable: null,
      }));
    } catch (error) {
      if (session !== getQuerySession() || revision !== inventoryRevision) return;
      console.error(`Failed to load ${tableName}:`, error);
      set({
        error: error instanceof Error ? error.message : `Failed to load ${tableName}`,
        loadingTable: null,
      });
    }
  },

  updateTableData: async (tableName, updates) => {
    inventoryRevision++; inventoryRequest = null;
    set({ loading: false });
    set({ loadingTable: tableName, error: null });
    try {
      await inventoryService.updateMultipleRows(tableName, updates);

      // Reload the table data after successful update
      await get().loadTableData(tableName);
    } catch (error) {
      console.error(`Failed to update ${tableName}:`, error);
      set({
        error: error instanceof Error ? error.message : `Failed to update ${tableName}`,
        loadingTable: null,
      });
      throw error;
    }
  },

  setError: (error) => set({ error }),
}));
