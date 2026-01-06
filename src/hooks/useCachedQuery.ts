import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { fetchQuery, getQuerySnapshot, invalidateQueries, isStale, subscribe } from '@/lib/queryCache';

interface CachedQueryOptions {
  staleTime?: number;
  refetchIntervalMs?: number;
  refetchOnWindowFocus?: boolean;
}

export const useCachedQuery = <T>(
  key: unknown,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options: CachedQueryOptions = {}
) => {
  const { staleTime = 30000, refetchIntervalMs, refetchOnWindowFocus = true } = options;

  const keyString = useMemo(() => JSON.stringify(key), [key]);
  const keyMemo = useMemo(() => key, [keyString]);

  const snapshot = useSyncExternalStore(
    (callback) => subscribe(keyMemo, callback),
    () => getQuerySnapshot<T>(keyMemo)
  );

  useEffect(() => {
    const controller = new AbortController();
    const shouldFetch = snapshot.data === undefined || isStale(keyMemo, staleTime);
    if (shouldFetch) {
      fetchQuery(keyMemo, () => fetcher(controller.signal), { staleTime }).catch(() => undefined);
    }

    return () => controller.abort();
  }, [keyMemo, fetcher, staleTime]);

  useEffect(() => {
    if (!refetchIntervalMs) return;
    const id = window.setInterval(() => {
      const controller = new AbortController();
      fetchQuery(keyMemo, () => fetcher(controller.signal), { staleTime }).catch(() => undefined);
    }, refetchIntervalMs);

    return () => window.clearInterval(id);
  }, [keyMemo, fetcher, refetchIntervalMs, staleTime]);

  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const onFocus = () => {
      const controller = new AbortController();
      fetchQuery(keyMemo, () => fetcher(controller.signal), { staleTime }).catch(() => undefined);
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [keyMemo, fetcher, refetchOnWindowFocus, staleTime]);

  return {
    data: snapshot.data,
    error: snapshot.error,
    isFetching: snapshot.isFetching,
    refresh: () => {
      invalidateQueries(keyMemo);
      const controller = new AbortController();
      return fetchQuery(keyMemo, () => fetcher(controller.signal), { staleTime });
    }
  };
};
