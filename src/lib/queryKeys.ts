export const queryKeys = {
  orders: (params?: Record<string, unknown>) => ['orders', params ?? {}],
  historyOrders: (params?: Record<string, unknown>) => ['historyOrders', params ?? {}],
  activities: (params?: Record<string, unknown>) => ['activities', params ?? {}],
  clients: (params?: Record<string, unknown>) => ['clients', params ?? {}],
  clientOrders: (params?: Record<string, unknown>) => ['clientOrders', params ?? {}],
  drivers: (params?: Record<string, unknown>) => ['drivers', params ?? {}],
  inventory: (params?: Record<string, unknown>) => ['inventory', params ?? {}],
};
