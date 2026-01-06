import { useEffect } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { queryKeys } from '@/lib/queryKeys';
import { fetchActiveOrders, fetchActivities, fetchHistoryOrders } from '@/lib/dataFetchers';
import { useDashboardStore } from '@/stores/dashboardStore';

export const useDashboardDataSync = (enabled: boolean) => {
  const setDashboardState = useDashboardStore.setState;

  const ordersQuery = useCachedQuery(queryKeys.orders({ scope: 'active' }), fetchActiveOrders, {
    staleTime: 30000,
    refetchIntervalMs: 60000,
    enabled,
  });

  const historyQuery = useCachedQuery(queryKeys.historyOrders({ scope: 'delivered' }), fetchHistoryOrders, {
    staleTime: 60000,
    refetchIntervalMs: 90000,
    enabled,
  });

  const activitiesQuery = useCachedQuery(queryKeys.activities({ scope: 'recent' }), fetchActivities, {
    staleTime: 30000,
    refetchIntervalMs: 60000,
    enabled,
  });

  useEffect(() => {
    setDashboardState((state) => ({
      ...state,
      loading: ordersQuery.isFetching,
      error: ordersQuery.error ? ordersQuery.error.message : null,
    }));
  }, [ordersQuery.error, ordersQuery.isFetching, setDashboardState]);

  useEffect(() => {
    if (ordersQuery.data) {
      setDashboardState((state) => {
        const stats = {
          todayOrders: ordersQuery.data.length,
          inProgress: ordersQuery.data.filter((o) => o.status === 'in-progress').length,
          completed: ordersQuery.data.filter((o) => o.status === 'completed').length,
          delayed: ordersQuery.data.filter((o) => o.status === 'delayed').length,
          delivered: state.stats.delivered,
        };

        return {
          orders: ordersQuery.data,
          stats,
          loading: ordersQuery.isFetching,
          error: ordersQuery.error ? ordersQuery.error.message : null,
        };
      });
    }
  }, [ordersQuery.data, ordersQuery.error, ordersQuery.isFetching, setDashboardState]);

  useEffect(() => {
    if (historyQuery.data) {
      setDashboardState((state) => ({
        historyOrders: historyQuery.data,
        stats: {
          ...state.stats,
          delivered: historyQuery.data.length,
        },
      }));
    }
  }, [historyQuery.data, setDashboardState]);

  useEffect(() => {
    if (activitiesQuery.data) {
      setDashboardState({ activities: activitiesQuery.data });
    }
  }, [activitiesQuery.data, setDashboardState]);
};
