import { supabase } from './supabase';
export type FilterMode = 'all' | 'straight-bar' | 'cut-and-bend';

export type DailySeriesEntry = {
  date: string;
  tons: number;
};

export type DiameterDistributionEntry = {
  label: string;
  tons: number;
};

export type AnalyticsSummary = {
  rowsAnalyzed: number;
  activeDays: number;
  totalTons: number;
  dailyAverage: number;
  timeSeries: DailySeriesEntry[];
  diameterTotals: DiameterDistributionEntry[];
};

type AnalyticsCacheEntry = {
  expiresAt: number;
  data: AnalyticsSummary;
};

const rangeCache = new Map<string, AnalyticsCacheEntry>();
const CACHE_TTL_MS = 60_000;

const getMaxDateFromTable = async (table: 'orders' | 'history_orders', signal?: AbortSignal) => {
  const query = supabase
    .from(table)
    .select('date')
    .order('date', { ascending: false })
    .limit(1);

  const { data, error } = signal ? await query.abortSignal(signal) : await query;
  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.date ?? null;
};

export const fetchMaxDateAcrossTables = async (signal?: AbortSignal) => {
  const [ordersMax, historyMax] = await Promise.all([
    getMaxDateFromTable('orders', signal),
    getMaxDateFromTable('history_orders', signal),
  ]);

  if (!ordersMax && !historyMax) {
    return null;
  }

  if (!ordersMax) {
    return historyMax;
  }

  if (!historyMax) {
    return ordersMax;
  }

  return ordersMax >= historyMax ? ordersMax : historyMax;
};

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeSummary = (data: {
  rows_analyzed: number;
  active_days: number;
  total_tons: number;
  daily_average: number;
  time_series: DailySeriesEntry[];
  diameter_totals: DiameterDistributionEntry[];
}): AnalyticsSummary => ({
  rowsAnalyzed: parseNumber(data.rows_analyzed),
  activeDays: parseNumber(data.active_days),
  totalTons: parseNumber(data.total_tons),
  dailyAverage: parseNumber(data.daily_average),
  timeSeries: (data.time_series ?? []).map((entry) => ({
    date: entry.date,
    tons: parseNumber(entry.tons),
  })),
  diameterTotals: (data.diameter_totals ?? []).map((entry) => ({
    label: entry.label,
    tons: parseNumber(entry.tons),
  })),
});

export const fetchAnalyticsSummary = async ({
  startDate,
  endDate,
  mode,
  signal,
}: {
  startDate: string;
  endDate: string;
  mode: FilterMode;
  signal?: AbortSignal;
}): Promise<AnalyticsSummary> => {
  const cacheKey = `${startDate}|${endDate}|${mode}`;
  const cached = rangeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const query = supabase
    .rpc('steel_analytics_summary', {
      start_date: startDate,
      end_date: endDate,
      mode,
    });

  const { data, error } = signal ? await query.abortSignal(signal) : await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!data || Array.isArray(data)) {
    throw new Error('No analytics data returned.');
  }

  const normalized = normalizeSummary(data);
  rangeCache.set(cacheKey, { data: normalized, expiresAt: Date.now() + CACHE_TTL_MS });
  return normalized;
};
