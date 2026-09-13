const cache = new Map<string, { expiresAt: number; retainUntil: number; data: unknown }>();
type PendingRead = { promise: Promise<unknown>; controller: AbortController; users: number; timer?: ReturnType<typeof setTimeout> };
const pending = new Map<string, PendingRead>();
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
};


export const peekQuery = <T>(key: string, options: { allowStale?: boolean } = {}): T | undefined => {
  const entry = cache.get(key);
  return entry && (options.allowStale ? entry.retainUntil : entry.expiresAt) > Date.now() ? entry.data as T : undefined;
};

export const invalidateQueries = (prefix = '') => {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  for (const [key, entry] of pending) if (key.startsWith(prefix)) {
    clearTimeout(entry.timer);
    pending.delete(key);
    entry.controller.abort();
  }
};
let sessionRevision = 0;
export const getQuerySession = () => sessionRevision;
export const resetQuerySession = () => { sessionRevision++; invalidateQueries(); };

// Each caller can cancel independently. A one-task grace period lets StrictMode's
// replacement effect reuse the same request instead of downloading it twice.
export const cachedRead = async <T>(key: string, read: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal, options: { force?: boolean; ttlMs?: number } = {}): Promise<T> => {
  throwIfAborted(signal);
  const cached = cache.get(key);
  if (!options.force && cached && cached.expiresAt > Date.now()) return cached.data as T;
  let request = pending.get(key);
  if (!request) {
    const entry: PendingRead = { promise: Promise.resolve(), controller: new AbortController(), users: 0 };
    entry.promise = Promise.resolve().then(() => read(entry.controller.signal)).then(data => {
      throwIfAborted(entry.controller.signal);
      if (pending.get(key) === entry) {
        for (const [oldKey, value] of cache) if (value.retainUntil <= Date.now()) cache.delete(oldKey);
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        const expiresAt = Date.now() + (options.ttlMs ?? 30_000);
        cache.set(key, { data, expiresAt, retainUntil: expiresAt + 5 * 60_000 });
      }
      return data;
    }).finally(() => {
      if (pending.get(key) === entry) pending.delete(key);
    });
    pending.set(key, entry);
    request = entry;
  }
  const entry = request;
  clearTimeout(entry.timer);
  entry.users++;
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const finish = (callback: () => void) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', abort);
      entry.users--;
      if (!entry.users && pending.get(key) === entry) {
        entry.timer = setTimeout(() => {
          if (!entry.users && pending.get(key) === entry) {
            pending.delete(key);
            entry.controller.abort();
          }
        }, 0);
      }
      callback();
    };
    const abort = () => finish(() => reject(new DOMException('The operation was aborted.', 'AbortError')));
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(data => finish(() => resolve(data as T)), error => finish(() => reject(error)));
    if (signal?.aborted) abort();
  });
};


if (import.meta.hot) import.meta.hot.dispose(() => resetQuerySession());
