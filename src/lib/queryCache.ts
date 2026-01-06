type QueryKey = unknown;

type CacheEntry<T> = {
  data?: T;
  error?: Error;
  updatedAt: number;
  promise?: Promise<T>;
  subscribers: Set<() => void>;
  snapshot: QuerySnapshot<T>;
};

type FetchOptions = {
  staleTime?: number;
};

const cache = new Map<string, CacheEntry<any>>();

const serializeKey = (key: QueryKey) => JSON.stringify(key);

type QuerySnapshot<T> = {
  data?: T;
  error?: Error;
  updatedAt: number;
  isFetching: boolean;
};

const buildSnapshot = <T>(entry: CacheEntry<T>): QuerySnapshot<T> => ({
  data: entry.data,
  error: entry.error,
  updatedAt: entry.updatedAt,
  isFetching: Boolean(entry.promise),
});

const updateSnapshot = <T>(entry: CacheEntry<T>) => {
  entry.snapshot = buildSnapshot(entry);
};

const getEntry = <T>(key: QueryKey): CacheEntry<T> => {
  const keyString = serializeKey(key);
  const existing = cache.get(keyString);
  if (existing) {
    return existing as CacheEntry<T>;
  }
  const entry: CacheEntry<T> = {
    updatedAt: 0,
    subscribers: new Set(),
    snapshot: {
      data: undefined,
      error: undefined,
      updatedAt: 0,
      isFetching: false,
    },
  };
  cache.set(keyString, entry);
  return entry;
};

export const getQueryData = <T>(key: QueryKey): T | undefined => {
  return getEntry<T>(key).data;
};

export const setQueryData = <T>(key: QueryKey, data: T) => {
  const entry = getEntry<T>(key);
  entry.data = data;
  entry.error = undefined;
  entry.updatedAt = Date.now();
  entry.promise = undefined;
  updateSnapshot(entry);
  entry.subscribers.forEach((notify) => notify());
};

export const setQueryError = (key: QueryKey, error: Error) => {
  const entry = getEntry(key);
  entry.error = error;
  entry.promise = undefined;
  updateSnapshot(entry);
  entry.subscribers.forEach((notify) => notify());
};

export const isStale = (key: QueryKey, staleTime: number) => {
  const entry = getEntry(key);
  return Date.now() - entry.updatedAt > staleTime;
};

export const fetchQuery = async <T>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  options: FetchOptions = {}
): Promise<T> => {
  const { staleTime = 0 } = options;
  const entry = getEntry<T>(key);

  if (entry.promise) {
    return entry.promise;
  }

  if (entry.data !== undefined && !isStale(key, staleTime)) {
    return Promise.resolve(entry.data);
  }

  const promise = fetcher()
    .then((data) => {
      setQueryData(key, data);
      return data;
    })
    .catch((error) => {
      setQueryError(key, error instanceof Error ? error : new Error('Query failed'));
      throw error;
    })
    .finally(() => {
      const latestEntry = getEntry<T>(key);
      latestEntry.promise = undefined;
    });

  entry.promise = promise;
  updateSnapshot(entry);
  entry.subscribers.forEach((notify) => notify());
  return promise;
};

export const invalidateQueries = (keyPrefix?: QueryKey) => {
  if (!keyPrefix) {
    cache.forEach((entry) => {
      entry.updatedAt = 0;
      updateSnapshot(entry);
      entry.subscribers.forEach((notify) => notify());
    });
    return;
  }

  const prefixString = serializeKey(keyPrefix).slice(0, -1);
  cache.forEach((entry, key) => {
    if (key.startsWith(prefixString)) {
      entry.updatedAt = 0;
      updateSnapshot(entry);
      entry.subscribers.forEach((notify) => notify());
    }
  });
};

export const subscribe = (key: QueryKey, callback: () => void) => {
  const entry = getEntry(key);
  entry.subscribers.add(callback);
  return () => {
    entry.subscribers.delete(callback);
  };
};

export const getQuerySnapshot = <T>(key: QueryKey) => {
  const entry = getEntry<T>(key);
  return entry.snapshot;
};
