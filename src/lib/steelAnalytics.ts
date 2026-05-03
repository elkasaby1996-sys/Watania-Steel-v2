import { supabase } from './supabase';
import { normalizeOrderType } from './orderTypes';

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

type AnalyticsOrderRow = {
  id: string;
  date: string | null;
  delivered_at?: string | null;
  status?: string | null;
  tons: number | string | null;
  order_type?: string | null;
  breakdown_8mm?: number | string | null;
  breakdown_10mm?: number | string | null;
  breakdown_12mm?: number | string | null;
  breakdown_14mm?: number | string | null;
  breakdown_16mm?: number | string | null;
  breakdown_18mm?: number | string | null;
  breakdown_20mm?: number | string | null;
  breakdown_25mm?: number | string | null;
  breakdown_32mm?: number | string | null;
};

type DeliveredAnalyticsRow = AnalyticsOrderRow & {
  analyticsDate: string;
  sourcePriority: number;
};

const rangeCache = new Map<string, AnalyticsCacheEntry>();
let deliveredRowsCache: { expiresAt: number; data: DeliveredAnalyticsRow[] } | null = null;
const CACHE_TTL_MS = 60_000;
const PAGE_SIZE = 1000;
const ANALYTICS_COLUMNS = [
  'id',
  'date',
  'delivered_at',
  'status',
  'tons',
  'order_type',
  'breakdown_8mm',
  'breakdown_10mm',
  'breakdown_12mm',
  'breakdown_14mm',
  'breakdown_16mm',
  'breakdown_18mm',
  'breakdown_20mm',
  'breakdown_25mm',
  'breakdown_32mm',
].join(', ');

const getDatePart = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return value.split('T')[0] || null;
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
};

const fetchDeliveredRows = async (
  table: 'history_orders' | 'orders',
  sourcePriority: number,
  signal?: AbortSignal
): Promise<DeliveredAnalyticsRow[]> => {
  const rows: DeliveredAnalyticsRow[] = [];
  let offset = 0;

  while (true) {
    throwIfAborted(signal);

    const query = supabase
      .from(table)
      .select(ANALYTICS_COLUMNS)
      .eq('status', 'delivered')
      .order('date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = signal
      ? await query.abortSignal(signal)
      : await query;

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as unknown as AnalyticsOrderRow[];

    for (const row of page) {
      const analyticsDate = table === 'orders'
        ? getDatePart(row.delivered_at) ?? getDatePart(row.date)
        : getDatePart(row.date);

      if (analyticsDate) {
        rows.push({
          ...row,
          analyticsDate,
          sourcePriority,
        });
      }
    }

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    offset += PAGE_SIZE;
  }
};

const fetchDeliveredAnalyticsRows = async (signal?: AbortSignal): Promise<DeliveredAnalyticsRow[]> => {
  if (deliveredRowsCache && deliveredRowsCache.expiresAt > Date.now()) {
    return deliveredRowsCache.data;
  }

  const [historyRows, activeRows] = await Promise.all([
    fetchDeliveredRows('history_orders', 0, signal),
    fetchDeliveredRows('orders', 1, signal),
  ]);

  const deduped = new Map<string, DeliveredAnalyticsRow>();

  for (const row of [...historyRows, ...activeRows]) {
    const existing = deduped.get(row.id);
    if (!existing || row.sourcePriority < existing.sourcePriority) {
      deduped.set(row.id, row);
    }
  }

  const rows = Array.from(deduped.values());
  deliveredRowsCache = { data: rows, expiresAt: Date.now() + CACHE_TTL_MS };
  return rows;
};

export const fetchMaxDateAcrossTables = async (mode: FilterMode = 'all', signal?: AbortSignal) => {
  const rows = await fetchDeliveredAnalyticsRows(signal);
  let maxDate: string | null = null;

  for (const row of rows) {
    if (mode !== 'all' && normalizeOrderType(row.order_type) !== mode) {
      continue;
    }

    if (!maxDate || row.analyticsDate > maxDate) {
      maxDate = row.analyticsDate;
    }
  }

  return maxDate;
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

const buildDateSeries = (startDate: string, endDate: string): DailySeriesEntry[] => {
  const dates: DailySeriesEntry[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    dates.push({
      date: cursor.toISOString().split('T')[0],
      tons: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

const buildClientSideSummary = async ({
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
  const rows = await fetchDeliveredAnalyticsRows(signal);
  const filtered = rows.filter((row) => (
    row.analyticsDate >= startDate
    && row.analyticsDate <= endDate
    && (mode === 'all' || normalizeOrderType(row.order_type) === mode)
  ));

  const timeSeries = buildDateSeries(startDate, endDate);
  const tonsByDate = new Map(timeSeries.map((entry) => [entry.date, entry]));
  const activeDates = new Set<string>();
  const diameterTotals = new Map<string, number>([
    ['8mm', 0],
    ['10mm', 0],
    ['12mm', 0],
    ['14mm', 0],
    ['16mm', 0],
    ['18mm', 0],
    ['20mm', 0],
    ['25mm', 0],
    ['32mm', 0],
  ]);

  let totalTons = 0;

  for (const row of filtered) {
    const tons = parseNumber(row.tons);
    totalTons += tons;
    activeDates.add(row.analyticsDate);

    const day = tonsByDate.get(row.analyticsDate);
    if (day) {
      day.tons += tons;
    }

    diameterTotals.set('8mm', (diameterTotals.get('8mm') ?? 0) + parseNumber(row.breakdown_8mm));
    diameterTotals.set('10mm', (diameterTotals.get('10mm') ?? 0) + parseNumber(row.breakdown_10mm));
    diameterTotals.set('12mm', (diameterTotals.get('12mm') ?? 0) + parseNumber(row.breakdown_12mm));
    diameterTotals.set('14mm', (diameterTotals.get('14mm') ?? 0) + parseNumber(row.breakdown_14mm));
    diameterTotals.set('16mm', (diameterTotals.get('16mm') ?? 0) + parseNumber(row.breakdown_16mm));
    diameterTotals.set('18mm', (diameterTotals.get('18mm') ?? 0) + parseNumber(row.breakdown_18mm));
    diameterTotals.set('20mm', (diameterTotals.get('20mm') ?? 0) + parseNumber(row.breakdown_20mm));
    diameterTotals.set('25mm', (diameterTotals.get('25mm') ?? 0) + parseNumber(row.breakdown_25mm));
    diameterTotals.set('32mm', (diameterTotals.get('32mm') ?? 0) + parseNumber(row.breakdown_32mm));
  }

  const totalBreakdown = Array.from(diameterTotals.values()).reduce((sum, value) => sum + value, 0);
  const calendarDays = Math.max(timeSeries.length, 1);
  const distribution = Array.from(diameterTotals.entries()).map(([label, tons]) => ({ label, tons }));

  if (totalTons > totalBreakdown) {
    distribution.push({
      label: 'Other',
      tons: totalTons - totalBreakdown,
    });
  }

  return {
    rowsAnalyzed: filtered.length,
    activeDays: activeDates.size,
    totalTons,
    dailyAverage: totalTons / calendarDays,
    timeSeries,
    diameterTotals: distribution,
  };
};

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

  const normalized = await buildClientSideSummary({
    startDate,
    endDate,
    mode,
    signal,
  });

  rangeCache.set(cacheKey, { data: normalized, expiresAt: Date.now() + CACHE_TTL_MS });
  return normalized;
};
