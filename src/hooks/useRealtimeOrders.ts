import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { invalidateQueries } from '@/lib/queryCache';
import { queryKeys } from '@/lib/queryKeys';

const CHANNEL_NAME = 'orders-realtime';

export const useRealtimeOrders = (enabled: boolean) => {
  const retryRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let channel = supabase.channel(CHANNEL_NAME);

    const subscribe = () => {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          invalidateQueries(queryKeys.orders({ scope: 'active' }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'history_orders' }, () => {
          invalidateQueries(queryKeys.historyOrders({ scope: 'delivered' }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
          invalidateQueries(queryKeys.activities({ scope: 'recent' }));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryRef.current = 0;
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[realtime] ${CHANNEL_NAME} status: ${status}. Reconnecting...`);
            const backoff = Math.min(30000, 1000 * 2 ** retryRef.current);
            retryRef.current += 1;
            if (timerRef.current) {
              window.clearTimeout(timerRef.current);
            }
            timerRef.current = window.setTimeout(() => {
              channel.unsubscribe();
              channel = supabase.channel(CHANNEL_NAME);
              subscribe();
            }, backoff);
          }
        });
    };

    subscribe();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [enabled]);
};
