// src/lib/rpcWithRetry.ts
import { supabase } from '@/lib/supabase';

type RpcOptions = {
  signal?: AbortSignal;
  retries?: number;
  baseDelayMs?: number;
};

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }
  });
}

function isRetryable(error: any) {
  const status = typeof error?.status === 'number' ? error.status : 0;
  const code = typeof error?.code === 'string' ? error.code : '';

  // common transient statuses
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;

  // sometimes supabase returns codes instead of status
  if (code === 'PGRST301' || code === 'PGRST302') return true;

  return false;
}

/**
 * Safe RPC wrapper (supports AbortSignal + retries)
 * Returns the same shape Supabase returns: { data, error }
 */
export async function rpcWithRetry<T>(
  fn: string,
  args: Record<string, any> = {},
  options: RpcOptions = {}
): Promise<{ data: T | null; error: any | null }> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;
  const signal = options.signal;

  let attempt = 0;

  while (true) {
    if (signal?.aborted) {
      return { data: null, error: new DOMException('Aborted', 'AbortError') };
    }

    const rpcCall = supabase.rpc(fn, args);
    const { data, error } = signal ? await rpcCall.abortSignal(signal) : await rpcCall;

    if (!error) return { data: (data as T) ?? null, error: null };

    // Abort should not retry
    if (signal?.aborted || error?.name === 'AbortError') {
      return { data: null, error };
    }

    // retry only for transient errors
    if (attempt >= retries || !isRetryable(error)) {
      return { data: null, error };
    }

    attempt += 1;
    const delay = baseDelayMs * Math.pow(2, attempt - 1);
    await sleep(delay, signal);
  }
}

