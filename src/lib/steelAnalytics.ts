import { cachedRead, invalidateQueries } from './queryCache';
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

export const invalidateAnalyticsCache = () => invalidateQueries('analytics:');
const sharedRead = <T>(key: string, read: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) =>
  cachedRead('analytics:' + key, read, signal, { ttlMs: 60_000 });

type Source = 'history' | 'delivered' | 'fallback';
const sources: Source[] = ['history', 'delivered', 'fallback'];
const dateColumn = (source: Source) => source === 'delivered' ? 'delivered_at' : 'date';
const sourceQuery = (source: Source, columns: string) => {
  let query = supabase.from(source === 'history' ? 'history_orders' : 'orders')
    .select(columns).eq('status', 'delivered');
  if (source === 'delivered') query = query.not('delivered_at', 'is', null);
  if (source === 'fallback') query = query.is('delivered_at', null);
  return query;
};

// History takes precedence even when its date/type is outside the selected range.
const historyIds = async (ids: string[], signal: AbortSignal) => {
  const found = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    throwIfAborted(signal);
    const { data, error } = await supabase.from('history_orders').select('id')
      .eq('status', 'delivered').not('date', 'is', null)
      .in('id', ids.slice(offset, offset + 100)).abortSignal(signal);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) found.add(row.id);
  }
  return found;
};

const fetchDeliveredRows = async (
  source: Source,
  startDate: string,
  endDate: string,
  signal: AbortSignal
): Promise<DeliveredAnalyticsRow[]> => {
  const rows: DeliveredAnalyticsRow[] = [];
  let offset = 0;

  while (true) {
    throwIfAborted(signal);

    const column = dateColumn(source);
    let query = sourceQuery(source, ANALYTICS_COLUMNS)
      .gte(column, source === 'delivered' ? `${startDate}T00:00:00Z` : startDate)
      .order(column, { ascending: false }).order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (source === 'delivered') {
      const nextDay = new Date(`${endDate}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query = query.lt(column, nextDay.toISOString());
    } else query = query.lte(column, endDate);
    const { data, error } = await query.abortSignal(signal);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as unknown as AnalyticsOrderRow[];

    for (const row of page) {
      const analyticsDate = source !== 'history'
        ? getDatePart(row.delivered_at) ?? getDatePart(row.date)
        : getDatePart(row.date);

      if (analyticsDate) {
        rows.push({
          ...row,
          analyticsDate,
          sourcePriority: source === 'history' ? 0 : 1,
        });
      }
    }

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    offset += PAGE_SIZE;
  }
};

const fetchDeliveredAnalyticsRows = (startDate: string, endDate: string, signal?: AbortSignal): Promise<DeliveredAnalyticsRow[]> =>
  sharedRead(`rows|${startDate}|${endDate}`, async sharedSignal => {
    const [historyRows, deliveredRows, fallbackRows] = await Promise.all(
      sources.map(source => fetchDeliveredRows(source, startDate, endDate, sharedSignal))
    );
    const activeRows = [...deliveredRows, ...fallbackRows];
    const inRangeIds = new Set(historyRows.map(row => row.id));
    const archivedIds = await historyIds(activeRows.filter(row => !inRangeIds.has(row.id)).map(row => row.id), sharedSignal);

    const deduped = new Map<string, DeliveredAnalyticsRow>();

    for (const row of [...historyRows, ...activeRows]) {
      if (row.sourcePriority > 0 && archivedIds.has(row.id)) continue;
      const existing = deduped.get(row.id);
      if (!existing || row.sourcePriority < existing.sourcePriority) {
        deduped.set(row.id, row);
      }
    }

    return Array.from(deduped.values());
  }, signal);

export const fetchMaxDateAcrossTables = (mode: FilterMode = 'all', signal?: AbortSignal): Promise<string | null> =>
  sharedRead(`latest|${mode}`, async sharedSignal => {
    const latestFromSource = async (source: Source, floor?: string | null) => {
      // Read only date/type metadata, stopping as soon as a matching row is found.
      // Client normalization deliberately supports legacy type spellings.
      const pageSize = source === 'history' && mode === 'all' ? 1 : 100;
      for (let offset = 0; ; offset += pageSize) {
        throwIfAborted(sharedSignal);
        let query = sourceQuery(source, 'id, date, delivered_at, order_type')
          .not(dateColumn(source), 'is', null)
          .order(dateColumn(source), { ascending: false }).order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (floor) {
          if (source === 'delivered') {
            const nextDay = new Date(`${floor}T00:00:00Z`);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            query = query.gte('delivered_at', nextDay.toISOString());
          } else query = query.gt('date', floor);
        }
        const { data, error } = await query.abortSignal(sharedSignal);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as unknown as AnalyticsOrderRow[];
        const matching = page.filter(row => mode === 'all' || normalizeOrderType(row.order_type) === mode);
        const archived = source === 'history' ? new Set<string>() : await historyIds(matching.map(row => row.id), sharedSignal);
        const row = matching.find(row => !archived.has(row.id));
        if (row) return getDatePart(source === 'delivered' ? row.delivered_at : row.date);
        if (page.length < pageSize) return null;
      }
    };
    const historyDate = await latestFromSource('history');
    const dates = [historyDate, ...await Promise.all([
      latestFromSource('delivered', historyDate), latestFromSource('fallback', historyDate),
    ])];
    return dates.reduce<string | null>((latest, date) => date && (!latest || date > latest) ? date : latest, null);
  }, signal);

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
  const rows = await fetchDeliveredAnalyticsRows(startDate, endDate, signal);
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
  return sharedRead(`summary|${startDate}|${endDate}|${mode}`, sharedSignal => buildClientSideSummary({
    startDate,
    endDate,
    mode,
    signal: sharedSignal,
  }), signal);
};

if (import.meta.hot) import.meta.hot.dispose(invalidateAnalyticsCache);
