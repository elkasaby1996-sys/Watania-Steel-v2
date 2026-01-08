import { supabase } from './supabase';
import { roundTo3Decimals } from './utils';

export type FilterMode = 'all' | 'straight-bar' | 'cut-and-bend';

export type AnalyticsRow = {
  id: string;
  date: string;
  tons: number | null;
  order_type?: 'straight-bar' | 'cut-and-bend' | null;
  company?: string | null;
  breakdown_8mm?: number | null;
  breakdown_10mm?: number | null;
  breakdown_12mm?: number | null;
  breakdown_14mm?: number | null;
  breakdown_16mm?: number | null;
  breakdown_18mm?: number | null;
  breakdown_20mm?: number | null;
  breakdown_25mm?: number | null;
  breakdown_32mm?: number | null;
  source: 'orders' | 'history_orders';
};

export type DailySeriesEntry = {
  date: string;
  tons: number;
};

export type DiameterDistributionEntry = {
  label: string;
  tons: number;
  percentOfTotalBreakdown: number;
};

export type AnalyticsResult = {
  totalTons: number;
  dailyAverage: number;
  activeDays: number;
  dailySeries: DailySeriesEntry[];
  diameterDistribution: DiameterDistributionEntry[];
};

const rangeCache = new Map<string, AnalyticsRow[]>();

const isDev = import.meta.env.DEV;

const breakdownFields = [
  'breakdown_8mm',
  'breakdown_10mm',
  'breakdown_12mm',
  'breakdown_14mm',
  'breakdown_16mm',
  'breakdown_18mm',
  'breakdown_20mm',
  'breakdown_25mm',
  'breakdown_32mm',
] as const;

const analyticsSelect = [
  'id',
  'date',
  'tons',
  'order_type',
  'company',
  ...breakdownFields,
].join(',');

const normalizeRow = (row: Omit<AnalyticsRow, 'source'>, source: AnalyticsRow['source']): AnalyticsRow => ({
  ...row,
  tons: Number(row.tons) || 0,
  order_type: row.order_type ?? null,
  breakdown_8mm: row.breakdown_8mm ?? null,
  breakdown_10mm: row.breakdown_10mm ?? null,
  breakdown_12mm: row.breakdown_12mm ?? null,
  breakdown_14mm: row.breakdown_14mm ?? null,
  breakdown_16mm: row.breakdown_16mm ?? null,
  breakdown_18mm: row.breakdown_18mm ?? null,
  breakdown_20mm: row.breakdown_20mm ?? null,
  breakdown_25mm: row.breakdown_25mm ?? null,
  breakdown_32mm: row.breakdown_32mm ?? null,
  source,
});

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

export const fetchAnalyticsRows = async ({
  startDate,
  endDate,
  signal,
}: {
  startDate: string;
  endDate: string;
  signal?: AbortSignal;
}): Promise<AnalyticsRow[]> => {
  const cacheKey = `${startDate}|${endDate}`;
  const cached = rangeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const ordersQuery = supabase
    .from('orders')
    .select(analyticsSelect)
    .gte('date', startDate)
    .lte('date', endDate);

  const historyQuery = supabase
    .from('history_orders')
    .select(analyticsSelect)
    .gte('date', startDate)
    .lte('date', endDate);

  const [{ data: orders, error: ordersError }, { data: history, error: historyError }] = await Promise.all([
    signal ? ordersQuery.abortSignal(signal) : ordersQuery,
    signal ? historyQuery.abortSignal(signal) : historyQuery,
  ]);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  if (historyError) {
    throw new Error(historyError.message);
  }

  const merged = new Map<string, AnalyticsRow>();
  let duplicatesRemoved = 0;

  (history ?? []).forEach((row) => {
    if (merged.has(row.id)) {
      duplicatesRemoved += 1;
    }
    merged.set(row.id, normalizeRow(row, 'history_orders'));
  });

  (orders ?? []).forEach((row) => {
    if (merged.has(row.id)) {
      duplicatesRemoved += 1;
      return;
    }
    merged.set(row.id, normalizeRow(row, 'orders'));
  });

  if (isDev && duplicatesRemoved > 0) {
    console.debug('[steel-analytics] dedupe removed rows', { duplicatesRemoved });
  }

  const rows = Array.from(merged.values());
  rangeCache.set(cacheKey, rows);
  return rows;
};

export const computeAnalytics = (rows: AnalyticsRow[], filterMode: FilterMode): AnalyticsResult => {
  const filtered = filterMode === 'all'
    ? rows
    : rows.filter((row) => row.order_type === filterMode);

  const dailyTotals = new Map<string, number>();

  filtered.forEach((row) => {
    if (!row.date) {
      return;
    }
    const current = dailyTotals.get(row.date) ?? 0;
    dailyTotals.set(row.date, current + (Number(row.tons) || 0));
  });

  const dailySeries = Array.from(dailyTotals.entries())
    .map(([date, total]) => ({ date, tons: total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeDays = dailySeries.filter((entry) => entry.tons > 0).length;
  const totalTons = dailySeries.reduce((sum, entry) => sum + entry.tons, 0);
  const dailyAverage = activeDays > 0 ? totalTons / activeDays : 0;

  const diameterTotals = breakdownFields.reduce<Record<string, number>>((acc, field) => {
    acc[field] = 0;
    return acc;
  }, {});

  filtered.forEach((row) => {
    breakdownFields.forEach((field) => {
      const value = Number(row[field]) || 0;
      diameterTotals[field] += value;
    });
  });

  const breakdownTotal = Object.values(diameterTotals).reduce((sum, value) => sum + value, 0);

  const diameterDistribution = breakdownFields
    .map((field) => {
      const label = field.replace('breakdown_', '').replace('mm', 'mm');
      const tons = diameterTotals[field];
      const percentOfTotalBreakdown = breakdownTotal > 0
        ? roundTo3Decimals((tons / breakdownTotal) * 100)
        : 0;
      return {
        label,
        tons: roundTo3Decimals(tons),
        percentOfTotalBreakdown,
      };
    })
    .filter((entry) => entry.tons > 0);

  return {
    totalTons: roundTo3Decimals(totalTons),
    dailyAverage: roundTo3Decimals(dailyAverage),
    activeDays,
    dailySeries: dailySeries.map((entry) => ({
      ...entry,
      tons: roundTo3Decimals(entry.tons),
    })),
    diameterDistribution,
  };
};
