import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSafeQuery } from '@/hooks/use-safe-query';
import { supabase } from '@/lib/supabase';

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

const EMPTY_SUMMARY: DailySummary = {
  avgCutAndBend: 0,
  avgStraightBar: 0,
  topDiameters: [],
  topClients: [],
  dayCount: 0,
  totalOrders: 0,
  maxDate: null
};

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

type DailySummaryRow = DiameterRow & {
  date: string;
  order_type?: string | null;
  tons?: number | null;
  company?: string | null;
};

type SummaryOrderRow = DailySummaryRow & {
  status?: string | null;
};

type SummaryQueryResult = {
  orders: SummaryOrderRow[];
  historyOrders: DailySummaryRow[];
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

const getMaxDate = (dates: string[]) => {
  if (dates.length === 0) return null;
  return dates.reduce((max, value) => (value > max ? value : max), dates[0]);
};

const normalizeCompany = (name: string) => name.trim().replace(/\s+/g, ' ');

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  const status = 'status' in error ? Number(error.status) : 0;
  return (
    status === 404 ||
    message.includes('does not exist') ||
    message.includes('PGRST116')
  );
};

export function DailySummaryCard() {
  const cutoffDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return formatLocalDate(date);
  }, []);

  const { data, isLoading } = useSafeQuery<SummaryQueryResult>(
    'daily-summary',
    async ({ signal }) => {
      let ordersQuery = supabase
        .from('orders')
        .select(
          'date,order_type,tons,company,status,breakdown_8mm,breakdown_10mm,breakdown_12mm,breakdown_14mm,breakdown_16mm,breakdown_18mm,breakdown_20mm,breakdown_25mm,breakdown_32mm'
        )
        .gte('date', cutoffDate)
        .neq('status', 'delivered');

      if (signal) {
        ordersQuery = ordersQuery.abortSignal(signal);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) {
        throw ordersError;
      }

      let historyOrders: DailySummaryRow[] = [];
      try {
        let historyQuery = supabase
          .from('history_orders')
          .select(
            'date,order_type,tons,company,breakdown_8mm,breakdown_10mm,breakdown_12mm,breakdown_14mm,breakdown_16mm,breakdown_18mm,breakdown_20mm,breakdown_25mm,breakdown_32mm'
          )
          .gte('date', cutoffDate);

        if (signal) {
          historyQuery = historyQuery.abortSignal(signal);
        }

        const { data: historyData, error: historyError } = await historyQuery;
        if (historyError) {
          throw historyError;
        }

        historyOrders = historyData || [];
      } catch (historyError) {
        if (!isMissingTableError(historyError)) {
          throw historyError;
        }

        let deliveredQuery = supabase
          .from('orders')
          .select(
            'date,order_type,tons,company,breakdown_8mm,breakdown_10mm,breakdown_12mm,breakdown_14mm,breakdown_16mm,breakdown_18mm,breakdown_20mm,breakdown_25mm,breakdown_32mm'
          )
          .gte('date', cutoffDate)
          .in('status', ['delivered', 'completed']);

        if (signal) {
          deliveredQuery = deliveredQuery.abortSignal(signal);
        }

        const { data: deliveredData, error: deliveredError } = await deliveredQuery;
        if (deliveredError) {
          throw deliveredError;
        }

        historyOrders = deliveredData || [];
      }

      return {
        orders: ordersData || [],
        historyOrders
      };
    },
    [cutoffDate]
  );

  const recentOrders = data?.orders ?? [];
  const historyOrders = data?.historyOrders ?? [];

  const summaryData = useMemo<DailySummary>(() => {
    if (!recentOrders.length && !historyOrders.length) {
      return EMPTY_SUMMARY;
    }

    const normalizedOrders: DailySummaryRow[] = [
      ...recentOrders.map((order) => ({
        date: order.date,
        order_type: order.order_type,
        tons: order.tons,
        company: order.company,
        breakdown_8mm: order.breakdown_8mm,
        breakdown_10mm: order.breakdown_10mm,
        breakdown_12mm: order.breakdown_12mm,
        breakdown_14mm: order.breakdown_14mm,
        breakdown_16mm: order.breakdown_16mm,
        breakdown_18mm: order.breakdown_18mm,
        breakdown_20mm: order.breakdown_20mm,
        breakdown_25mm: order.breakdown_25mm,
        breakdown_32mm: order.breakdown_32mm
      })),
      ...historyOrders.map((order) => ({
        date: order.date,
        order_type: order.order_type,
        tons: order.tons,
        company: order.company,
        breakdown_8mm: order.breakdown_8mm,
        breakdown_10mm: order.breakdown_10mm,
        breakdown_12mm: order.breakdown_12mm,
        breakdown_14mm: order.breakdown_14mm,
        breakdown_16mm: order.breakdown_16mm,
        breakdown_18mm: order.breakdown_18mm,
        breakdown_20mm: order.breakdown_20mm,
        breakdown_25mm: order.breakdown_25mm,
        breakdown_32mm: order.breakdown_32mm
      }))
    ];

    const dates = normalizedOrders.map((row) => row.date).filter(Boolean) as string[];
    const maxDate = getMaxDate(dates);
    if (!maxDate) {
      return EMPTY_SUMMARY;
    }

    const maxDateObj = parseDateString(maxDate);
    maxDateObj.setDate(maxDateObj.getDate() - 90);
    const startStr = formatLocalDate(maxDateObj);

    const rows = normalizedOrders.filter((row) => row.date >= startStr && row.date <= maxDate);
    const totalOrders = rows.length;
    const dayCount = new Set(rows.map((r) => r.date).filter(Boolean)).size;

    const cutAndBendTotal = rows
      .filter((r) => r.order_type === 'cut-and-bend')
      .reduce((sum, r) => sum + (Number(r.tons) || 0), 0);

    const straightBarTotal = rows
      .filter((r) => r.order_type === 'straight-bar')
      .reduce((sum, r) => sum + (Number(r.tons) || 0), 0);

    const diameterTotals = DIAMETER_FIELDS.map(({ key, label }) => ({
      label,
      tons: rows.reduce((sum, r) => sum + (Number((r as any)[key]) || 0), 0)
    }));

    const topDiameters = diameterTotals
      .filter((d) => d.tons > 0)
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 3);

    const clientTotals = rows.reduce<Record<string, number>>((acc, r) => {
      const companyRaw = r.company ?? '';
      const company = normalizeCompany(companyRaw);
      if (!company) return acc;
      acc[company] = (acc[company] || 0) + (Number(r.tons) || 0);
      return acc;
    }, {});

    const topClients = Object.entries(clientTotals)
      .map(([name, tons]) => ({ name, tons }))
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 3);

    return {
      avgCutAndBend: dayCount > 0 ? cutAndBendTotal / dayCount : 0,
      avgStraightBar: dayCount > 0 ? straightBarTotal / dayCount : 0,
      topDiameters,
      topClients,
      dayCount,
      totalOrders,
      maxDate
    };
  }, [historyOrders, recentOrders]);

  const showLoading = isLoading && summaryData.totalOrders === 0;

  const content = useMemo(() => {
    if (!summaryData) {
      return {
        avgCutAndBend: null as string | null,
        avgStraightBar: null as string | null,
        topDiameters: [] as DiameterSummary[],
        topClients: [] as ClientSummary[],
        maxDate: null as string | null,
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
          Daily Summary (Last 90 Days of Data)
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
            <p className="text-sm font-medium text-foreground">No data available for the last 90 days of data</p>
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
                        <span className="text-sm font-medium text-foreground/90">{formatTons(item.tons)}t</span>
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
                        <span className="text-sm font-medium text-foreground/90">{formatTons(item.tons)}t</span>
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
