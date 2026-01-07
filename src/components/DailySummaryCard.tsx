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

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const formatTons = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);

export function DailySummaryCard() {
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return date;
  }, [today]);

  const { data, isLoading } = useSafeQuery<DailySummary>(
    'daily-summary',
    async ({ signal }) => {
      let query = supabase
        .from('orders')
        .select(
          `
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
        `
        )
        .gte('date', formatDate(startDate))
        .lte('date', formatDate(today));

      if (signal) {
        query = query.abortSignal(signal);
      }

      const { data: orders, error } = await query;
      if (error) {
        throw error;
      }

      const rows = (orders || []) as DailySummaryRow[];
      const totalOrders = rows.length;
      const daySet = new Set(rows.map((row) => row.date).filter(Boolean));
      const dayCount = daySet.size || 30;

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
        const company = row.company?.trim() || 'Unknown';
        acc[company] = (acc[company] || 0) + (Number(row.tons) || 0);
        return acc;
      }, {});

      const topClients = Object.entries(clientTotals)
        .map(([name, tons]) => ({ name, tons }))
        .sort((a, b) => b.tons - a.tons)
        .slice(0, 3);

      return {
        avgCutAndBend: cutAndBendTotal / dayCount,
        avgStraightBar: straightBarTotal / dayCount,
        topDiameters,
        topClients,
        dayCount,
        totalOrders
      };
    },
    [startDate, today],
    {
      refreshOnFocus: true,
      refreshOnReconnect: true
    }
  );

  const content = useMemo(() => {
    if (!data || data.totalOrders === 0) {
      return {
        avgCutAndBend: '—',
        avgStraightBar: '—',
        topDiameters: '—',
        topClients: '—'
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
          : '—'
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
