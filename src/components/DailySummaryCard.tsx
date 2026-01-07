import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  return message.includes('does not exist') || message.includes('PGRST116');
};

export function DailySummaryCard() {
  const today = useMemo(() => new Date(), []);

  const { data, isLoading } = useSafeQuery<DailySummary>(
    'daily-summary',
    async ({ signal }) => {
      const fetchMaxDate = async (table: 'orders' | 'history_orders') => {
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

      const [ordersMax, historyMax] = await Promise.all([
        fetchMaxDate('orders'),
        fetchMaxDate('history_orders')
      ]);

      const maxDate =
        ordersMax && historyMax ? (ordersMax > historyMax ? ordersMax : historyMax) : ordersMax || historyMax;

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
      }

      const maxDateValue = parseDateString(maxDate);
      maxDateValue.setDate(maxDateValue.getDate() - 30);
      const startStr = formatLocalDate(maxDateValue);

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

      const fetchRows = async (table: 'orders' | 'history_orders') => {
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
          return rows || [];
        } catch (error) {
          if (isMissingTableError(error)) {
            return [];
          }
          throw error;
        }
      };

      const [ordersRows, historyRows] = await Promise.all([
        fetchRows('orders'),
        fetchRows('history_orders')
      ]);

      const rows = [...ordersRows, ...historyRows] as DailySummaryRow[];
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

      return {
        avgCutAndBend: dayCount > 0 ? cutAndBendTotal / dayCount : 0,
        avgStraightBar: dayCount > 0 ? straightBarTotal / dayCount : 0,
        topDiameters,
        topClients,
        dayCount,
        totalOrders,
        maxDate
      };
    },
    [today],
    {
      refreshOnFocus: true,
      refreshOnReconnect: true
    }
  );

  const content = useMemo(() => {
    if (!data || data.totalOrders === 0) {
      return {
        avgCutAndBend: 'No data available',
        avgStraightBar: 'No data available',
        topDiameters: 'No data available',
        topClients: 'No data available',
        maxDate: data?.maxDate || null
      };
    }

    return {
      avgCutAndBend: `${formatTons(data.avgCutAndBend)} t`,
      avgStraightBar: `${formatTons(data.avgStraightBar)} t`,
      topDiameters:
        data.topDiameters.length > 0
          ? data.topDiameters.map((item) => `${item.label} (${formatTons(item.tons)} t)`).join(', ')
          : '—',
      topClients:
        data.topClients.length > 0
          ? data.topClients.map((item) => `${item.name} (${formatTons(item.tons)} t)`).join(', ')
          : '—',
      maxDate: data.maxDate
    };
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Daily Summary (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="text-xs text-muted-foreground">
          Based on max date: {content.maxDate || '—'}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span>Avg Cut &amp; Bend / day (t)</span>
          <span className="text-foreground font-medium">
            {isLoading ? '—' : content.avgCutAndBend}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Avg Straight Bar / day (t)</span>
          <span className="text-foreground font-medium">
            {isLoading ? '—' : content.avgStraightBar}
          </span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Top diameters</p>
          <p className="text-foreground text-sm">
            {isLoading ? '—' : content.topDiameters}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Top clients</p>
          <p className="text-foreground text-sm">
            {isLoading ? '—' : content.topClients}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
