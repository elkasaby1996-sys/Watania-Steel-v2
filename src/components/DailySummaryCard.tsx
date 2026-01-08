import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useSafeQuery } from '@/hooks/use-safe-query';

type DiameterSummary = {
  label: string;
  tons: number;
};

type ClientSummary = {
  name: string;
  tons: number;
};

type DailySummary = {
  avgCutAndBend: number;
  avgStraightBar: number;
  topDiameters: DiameterSummary[];
  topClients: ClientSummary[];
  dayCount: number;
  totalOrders: number;
  maxDate: string | null;
};

type SummaryCacheEntry = {
  data: DailySummary;
  cachedAt: number;
};

const SUMMARY_CACHE_TTL_MS = 60_000;
const summaryCache = new Map<string, SummaryCacheEntry>();
let latestSummaryCacheKey: string | null = null;
const EMPTY_SUMMARY: DailySummary = {
  avgCutAndBend: 0,
  avgStraightBar: 0,
  topDiameters: [],
  topClients: [],
  dayCount: 0,
  totalOrders: 0,
  maxDate: null
};

const DIAMETER_FIELDS: { key: keyof DiameterRow; label: string }[] = [
  { key: 'breakdown_8mm', label: '8mm' },
  { key: 'breakdown_10mm', label: '10mm' },
  { key: 'breakdown_12mm', label: '12mm' },
  { key: 'breakdown_14mm', label: '14mm' },
  { key: 'breakdown_16mm', label: '16mm' },
  { key: 'breakdown_18mm', label: '18mm' },
  { key: 'breakdown_20mm', label: '20mm' },
  { key: 'breakdown_25mm', label: '25mm' },
  { key: 'breakdown_32mm', label: '32mm' }
];

type DiameterRow = {
  breakdown_8mm?: number | null;
  breakdown_10mm?: number | null;
  breakdown_12mm?: number | null;
  breakdown_14mm?: number | null;
  breakdown_16mm?: number | null;
  breakdown_18mm?: number | null;
  breakdown_20mm?: number | null;
  breakdown_25mm?: number | null;
  breakdown_32mm?: number | null;
};

type DailySummaryRow = DiameterRow & {
  date: string;
  order_type?: string | null;
  tons?: number | null;
  company?: string | null;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatTons = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'AbortError' || message.includes('AbortError');
};

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  const status = 'status' in error ? Number(error.status) : undefined;
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('PGRST116') ||
    status === 404
  );
};

const getFreshSummaryCache = () => {
  if (!latestSummaryCacheKey) {
    return null;
  }
  const entry = summaryCache.get(latestSummaryCacheKey);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.cachedAt > SUMMARY_CACHE_TTL_MS) {
    return null;
  }
  return entry;
};

export function DailySummaryCard() {
  const cachedEntry = useMemo(() => getFreshSummaryCache(), []);
  const cachedData = cachedEntry?.data ?? null;
  const { data, isLoading } = useSafeQuery<DailySummary>(
    'daily-summary',
    async ({ signal }) => {
      const freshCache = getFreshSummaryCache();
      if (freshCache) {
        return freshCache.data;
      }
      const fetchMaxDate = async (table: 'orders' | 'order' | 'history_orders') => {
        try {
          let maxQuery = supabase.from(table).select('date').order('date', { ascending: false }).limit(1);
          if (signal) {
            maxQuery = maxQuery.abortSignal(signal);
          }
          const { data: maxData, error: maxError } = await maxQuery;
          if (maxError) {
            throw maxError;
          }
          return maxData?.[0]?.date || null;
        } catch (error) {
          if (isMissingTableError(error)) {
            return null;
          }
          throw error;
        }
      };

      const [orderMax, ordersMax, historyMax] = await Promise.all([
        fetchMaxDate('order'),
        fetchMaxDate('orders'),
        fetchMaxDate('history_orders')
      ]);

      const orderLikeMax = orderMax || ordersMax;
      const maxDate =
        orderLikeMax && historyMax ? (orderLikeMax > historyMax ? orderLikeMax : historyMax) : orderLikeMax || historyMax;

      if (!maxDate) {
        return {
          avgCutAndBend: 0,
          avgStraightBar: 0,
          topDiameters: [],
          topClients: [],
          dayCount: 0,
          totalOrders: 0,
          maxDate: null
        };

        const [ordersMax, historyMax] = await Promise.all([
          fetchMaxDate('orders'),
          fetchMaxDate('history_orders')
        ]);

      const selectColumns = `
        date,
        order_type,
        tons,
        company,
        breakdown_8mm,
        breakdown_10mm,
        breakdown_12mm,
        breakdown_14mm,
        breakdown_16mm,
        breakdown_18mm,
        breakdown_20mm,
        breakdown_25mm,
        breakdown_32mm
      `;

      const fetchRows = async (table: 'orders' | 'order' | 'history_orders') => {
        try {
          let query = supabase
            .from(table)
            .select(selectColumns)
            .gte('date', startStr)
            .lte('date', maxDate);
          if (signal) {
            query = query.abortSignal(signal);
          }
          const { data: rows, error } = await query;
          if (error) {
            throw error;
          }
        };

        const [ordersRows, historyRows] = await Promise.all([
          fetchRows('orders'),
          fetchRows('history_orders')
        ]);

        const rows = [...ordersRows, ...historyRows] as DailySummaryRow[];
        const totalOrders = rows.length;
        debug(
          'ordersRowsCount',
          ordersRows.length,
          'historyRowsCount',
          historyRows.length,
          'combinedCount',
          totalOrders
        );
        if (ordersRows.length > 0) {
          debug('ordersSample', ordersRows[0]);
        }
        if (historyRows.length > 0) {
          debug('historySample', historyRows[0]);
        }

      const [orderRows, ordersRows, historyRows] = await Promise.all([
        fetchRows('order'),
        fetchRows('orders'),
        fetchRows('history_orders')
      ]);

      const rows = [...orderRows, ...ordersRows, ...historyRows] as DailySummaryRow[];
      const totalOrders = rows.length;
      const daySet = new Set(rows.map((row) => row.date).filter(Boolean));
      const dayCount = daySet.size || 0;

      const cutAndBendTotal = rows
        .filter((row) => row.order_type === 'cut-and-bend')
        .reduce((sum, row) => sum + (Number(row.tons) || 0), 0);
      const straightBarTotal = rows
        .filter((row) => row.order_type === 'straight-bar')
        .reduce((sum, row) => sum + (Number(row.tons) || 0), 0);

      const diameterTotals = DIAMETER_FIELDS.map(({ key, label }) => ({
        label,
        tons: rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
      }));

      const topDiameters = diameterTotals
        .filter((item) => item.tons > 0)
        .sort((a, b) => b.tons - a.tons)
        .slice(0, 3);

      const clientTotals = rows.reduce<Record<string, number>>((acc, row) => {
        const company = row.company?.trim();
        if (!company) return acc;
        acc[company] = (acc[company] || 0) + (Number(row.tons) || 0);
        return acc;
      }, {});

      const topClients = Object.entries(clientTotals)
        .map(([name, tons]) => ({ name, tons }))
        .sort((a, b) => b.tons - a.tons)
        .slice(0, 3);

      const summaryResult = {
        avgCutAndBend: dayCount > 0 ? cutAndBendTotal / dayCount : 0,
        avgStraightBar: dayCount > 0 ? straightBarTotal / dayCount : 0,
        topDiameters,
        topClients,
        dayCount,
        totalOrders,
        maxDate
      };
      summaryCache.set(cacheKey, { data: summaryResult, cachedAt: now });
      latestSummaryCacheKey = cacheKey;
      return summaryResult;
    },
    [],
    {
      refreshOnFocus: false,
      refreshOnReconnect: false
    }
  );

  const summaryData = data ?? cachedData;
  const showLoading = isLoading && !summaryData;
  const content = useMemo(() => {
    if (!summaryData) {
      return {
        avgCutAndBend: null,
        avgStraightBar: null,
        topDiameters: [],
        topClients: [],
        maxDate: null,
        isEmpty: true
      };
    }

    if (summaryData.totalOrders === 0) {
      return {
        avgCutAndBend: null,
        avgStraightBar: null,
        topDiameters: [],
        topClients: [],
        maxDate: summaryData.maxDate,
        isEmpty: true
      };
    }

    return {
      avgCutAndBend: `${formatTons(summaryData.avgCutAndBend)} t`,
      avgStraightBar: `${formatTons(summaryData.avgStraightBar)} t`,
      topDiameters: summaryData.topDiameters,
      topClients: summaryData.topClients,
      maxDate: summaryData.maxDate,
      isEmpty: false
    };
  }, [summaryData]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Daily Summary (Last 30 Days of Data)
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {showLoading ? (
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
          ) : (
            <span>Based on max date: {content.maxDate || 'Not available yet'}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              {[...Array(2)].map((_, index) => (
                <div key={`kpi-skel-${index}`} className="space-y-2 rounded-xl bg-muted/20 p-4">
                  <div className="h-7 w-28 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-36 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={`diameter-skel-${index}`} className="h-5 w-full rounded bg-muted/30 animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={`client-skel-${index}`} className="h-5 w-full rounded bg-muted/30 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : content.isEmpty ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
            <p className="text-sm font-medium text-foreground">No data available for the last 30 days of data</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Add recent orders to see averages, top diameters, and top clients here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/20 p-4">
                <div className="flex items-end gap-1 text-2xl font-semibold text-foreground">
                  <span>{content.avgCutAndBend}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avg Cut &amp; Bend/day</div>
              </div>
              <div className="rounded-xl bg-muted/20 p-4">
                <div className="flex items-end gap-1 text-2xl font-semibold text-foreground">
                  <span>{content.avgStraightBar}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avg Straight Bar/day</div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top diameters</p>
                <div className="divide-y divide-border/50 rounded-lg bg-muted/10">
                  {content.topDiameters.length > 0 ? (
                    content.topDiameters.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-[11px] text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-foreground">{item.label}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground/90">
                          {formatTons(item.tons)}t
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No diameter totals yet.</div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top clients</p>
                <div className="divide-y divide-border/50 rounded-lg bg-muted/10">
                  {content.topClients.length > 0 ? (
                    content.topClients.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-[11px] text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground/90">
                          {formatTons(item.tons)}t
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No client totals yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
