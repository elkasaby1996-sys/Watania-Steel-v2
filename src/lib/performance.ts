const perfEnabled = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

type RequestStats = {
  count: number;
  totalBytes: number;
};

const requestStats: RequestStats = {
  count: 0,
  totalBytes: 0,
};

export const getRequestStats = () => ({ ...requestStats });

export const instrumentedFetch: typeof fetch = async (input, init) => {
  const requestId = ++requestStats.count;
  const url = typeof input === 'string' ? input : input.url;
  const method = init?.method || 'GET';
  const start = performance.now();

  const response = await fetch(input, init);
  const duration = performance.now() - start;

  if (perfEnabled) {
    try {
      const clone = response.clone();
      const text = await clone.text();
      const bytes = new Blob([text]).size;
      requestStats.totalBytes += bytes;

      const sizeKb = (bytes / 1024).toFixed(1);
      const durationMs = duration.toFixed(0);
      console.log(
        `[perf] #${requestId} ${method} ${url} - ${durationMs}ms, ${sizeKb}kb (total ${(
          requestStats.totalBytes / 1024
        ).toFixed(1)}kb)`
      );
    } catch (error) {
      console.warn('[perf] Failed to read response body for metrics', error);
    }
  }

  return response;
};

export const timeAsync = async <T>(label: string, task: () => Promise<T>): Promise<T> => {
  if (perfEnabled) {
    console.time(label);
  }

  try {
    return await task();
  } finally {
    if (perfEnabled) {
      console.timeEnd(label);
    }
  }
};

export const logReactRender = (componentName: string, durationMs: number) => {
  if (perfEnabled) {
    console.log(`[perf] ${componentName} render duration: ${durationMs}ms`);
  }
};
