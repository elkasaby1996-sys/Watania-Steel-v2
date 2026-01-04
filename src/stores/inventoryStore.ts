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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  data: initialData,
  loading: false,
  error: null,
  loadingTable: null,

  loadAllInventory: async () => {
    set({ loading: true, error: null });
    try {
      const { inventoryService } = await import('../lib/supabase');
      const data = await inventoryService.getAllInventory();
      set({ data, loading: false });
    } catch (error) {
      console.error('Failed to load inventory:', error);
      set({
        data: initialData,
        error: error instanceof Error ? error.message : 'Failed to load inventory',
        loading: false,
      });
    }
  },

  loadTableData: async (tableName: InventoryTableName) => {
    set({ loadingTable: tableName, error: null });
    try {
      const { inventoryService } = await import('../lib/supabase');
      const tableData = await inventoryService.getTableData(tableName);
      set(state => ({
        data: {
          ...state.data,
          [tableName]: tableData,
        },
        loadingTable: null,
      }));
    } catch (error) {
      console.error(`Failed to load ${tableName}:`, error);
      set({
        error: error instanceof Error ? error.message : `Failed to load ${tableName}`,
        loadingTable: null,
      });
    }
  },

  updateTableData: async (tableName, updates) => {
    set({ loadingTable: tableName, error: null });
    try {
      const { inventoryService } = await import('../lib/supabase');
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
