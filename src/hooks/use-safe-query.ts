import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SafeQueryOptions = {
  enabled?: boolean;
  refreshOnFocus?: boolean;
  refreshOnReconnect?: boolean;
};

type SafeQueryFetcher<T> = (options: { signal: AbortSignal }) => Promise<T>;

type SafeQueryResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
};

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'AbortError' || message.includes('AbortError');
};

export function useSafeQuery<T>(
  key: string,
  fetcher: SafeQueryFetcher<T>,
  deps: React.DependencyList,
  options: SafeQueryOptions = {}
): SafeQueryResult<T> {
  const {
    enabled = true,
    refreshOnFocus = true,
    refreshOnReconnect = true
  } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<T | null>(null);
  const fetcherRef = useRef(fetcher);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const inFlightKeyRef = useRef<string | null>(null);
  const inFlightPromiseRef = useRef<Promise<T> | null>(null);

  const depsKey = useMemo(() => {
    try {
      return JSON.stringify(deps, (_key, value) =>
        typeof value === 'function' ? '[function]' : value
      );
    } catch {
      return '';
    }
  }, deps);

  const requestKey = useMemo(() => `${key}:${depsKey}`, [key, depsKey]);

  const execute = useCallback(
    async (force = false) => {
      if (!enabled) {
        setIsLoading(false);
        return dataRef.current;
      }

      if (!force && inFlightKeyRef.current === requestKey && inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      const previousController = abortRef.current;
      if (previousController) {
        previousController.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);

      const promise = fetcherRef.current({ signal: controller.signal });
      inFlightKeyRef.current = requestKey;
      inFlightPromiseRef.current = promise;

      try {
        const response = await promise;
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return response;
        }
        dataRef.current = response;
        setData(response);
        return response;
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current || isAbortError(err)) {
          return null;
        }
        const nextError = err instanceof Error ? err : new Error('Request failed');
        setError(nextError);
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
        if (inFlightPromiseRef.current === promise) {
          inFlightPromiseRef.current = null;
          if (inFlightKeyRef.current === requestKey) {
            inFlightKeyRef.current = null;
          }
        }
      }
    },
    [enabled, requestKey]
  );

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    execute();
    return () => {
      abortRef.current?.abort();
    };
  }, [execute]);

  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => {
      execute(true);
    };

    if (refreshOnFocus) {
      window.addEventListener('focus', handleRefresh);
    }
    if (refreshOnReconnect) {
      window.addEventListener('online', handleRefresh);
    }

    return () => {
      if (refreshOnFocus) {
        window.removeEventListener('focus', handleRefresh);
      }
      if (refreshOnReconnect) {
        window.removeEventListener('online', handleRefresh);
      }
    };
  }, [enabled, execute, refreshOnFocus, refreshOnReconnect]);

  const refetch = useCallback(() => execute(true), [execute]);

  return { data, isLoading, error, refetch };
}
