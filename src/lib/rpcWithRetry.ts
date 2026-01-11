import { supabase } from '@/lib/supabase';

type RpcRetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
};

const isRetryableStatus = (status?: number) => {
  if (!status) return false;
  if (status === 429) return true;
  return status >= 500 && status < 600;
};

const isRetryableMessage = (message?: string) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('fetch failed')
  );
};

const shouldRetryError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const err = error as { status?: number; message?: string };
  if (err.status === 401 || err.status === 403) {
    return false;
  }

  return isRetryableStatus(err.status) || isRetryableMessage(err.message);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const rpcWithRetry = async <T>(
  fnName: string,
  params: Record<string, unknown> = {},
  options: RpcRetryOptions = {}
): Promise<{ data: T | null; error: Error | null }> => {
  const { retries = 2, retryDelayMs = 300, signal } = options;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    try {
      const { data, error } = await supabase.rpc(fnName, params, { signal });

      if (!error) {
        return { data: data as T, error: null };
      }

      lastError = error;

      if (!shouldRetryError(error) || attempt >= retries) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('RPC request failed');

      if (!shouldRetryError(err) || attempt >= retries) {
        break;
      }
    }

    await sleep(retryDelayMs * 2 ** attempt);
    attempt += 1;
  }

  return { data: null, error: lastError || new Error('RPC request failed') };
};
