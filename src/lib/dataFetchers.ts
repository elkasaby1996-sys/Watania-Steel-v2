import { activityService, historyService, orderService, dbToFrontend } from '@/lib/supabase';
import { timeAsync } from '@/lib/performance';

const DEFAULT_PAGE_SIZE = 500;
const ACTIVE_STATUSES = new Set(['pending', 'in-progress', 'completed', 'delayed']);

const normalizeStatus = (status?: string) => (status ? status.toLowerCase() : '');

const fetchAllPages = async <T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  pageSize: number
) => {
  const results: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(pageSize, offset);
    results.push(...page);
    if (page.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return results;
};

export const fetchActiveOrders = async (signal?: AbortSignal) => {
  return timeAsync('query:orders:active', async () => {
    const orders = await fetchAllPages(
      (limit, offset) =>
        orderService.list({
          limit,
          offset,
          sortBy: 'created_at',
          sortDirection: 'desc',
          signal,
        }),
      DEFAULT_PAGE_SIZE
    );
    return orders
      .map(dbToFrontend)
      .map((order) => ({
        ...order,
        status: normalizeStatus(order.status) as typeof order.status,
      }))
      .filter((order) => ACTIVE_STATUSES.has(order.status));
  });
};

export const fetchHistoryOrders = async (signal?: AbortSignal) => {
  return timeAsync('query:history:all', async () => {
    const historyOrders = await fetchAllPages(
      (limit, offset) =>
        historyService.list({
          limit,
          offset,
          sortBy: 'delivered_at',
          sortDirection: 'desc',
          signal,
        }),
      DEFAULT_PAGE_SIZE
    );

    if (historyOrders.length > 0) {
      return historyOrders;
    }

    const deliveredOrders = await fetchAllPages(
      (limit, offset) =>
        orderService.list({
          limit,
          offset,
          sortBy: 'delivered_at',
          sortDirection: 'desc',
          signal,
        }),
      DEFAULT_PAGE_SIZE
    );

    return deliveredOrders
      .filter((order) => normalizeStatus(order.status) === 'delivered')
      .map((order) => ({
        ...order,
        status: 'delivered',
      }));
  });
};

export const fetchActivities = async (signal?: AbortSignal) => {
  return timeAsync('query:activities:recent', () => activityService.list({ limit: 20, signal }));
};
