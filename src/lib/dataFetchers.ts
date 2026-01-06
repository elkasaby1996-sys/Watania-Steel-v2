import { activityService, historyService, orderService, dbToFrontend } from '@/lib/supabase';
import { timeAsync } from '@/lib/performance';

const DEFAULT_PAGE_SIZE = 500;

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
          status: ['pending', 'in-progress', 'completed', 'delayed'],
          limit,
          offset,
          sortBy: 'created_at',
          sortDirection: 'desc',
          signal,
        }),
      DEFAULT_PAGE_SIZE
    );
    return orders.map(dbToFrontend);
  });
};

export const fetchHistoryOrders = async (signal?: AbortSignal) => {
  return timeAsync('query:history:all', () =>
    fetchAllPages(
      (limit, offset) =>
        historyService.list({
          limit,
          offset,
          sortBy: 'delivered_at',
          sortDirection: 'desc',
          signal,
        }),
      DEFAULT_PAGE_SIZE
    )
  );
};

export const fetchActivities = async (signal?: AbortSignal) => {
  return timeAsync('query:activities:recent', () => activityService.list({ limit: 20, signal }));
};
