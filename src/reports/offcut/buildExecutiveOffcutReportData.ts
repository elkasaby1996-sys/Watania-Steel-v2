import { OffcutUsageEntry } from '@/lib/supabase';

export interface ProductionRow {
  date: string;
  tons?: number | null;
  order_type?: string | null;
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
}

export interface ExecutiveOffcutReportInput {
  startDate: string;
  endDate: string;
  offcutRows: OffcutUsageEntry[];
  productionRows?: ProductionRow[];
  ytdOffcutRows?: OffcutUsageEntry[];
  now: Date;
}

export interface BreakdownRow {
  diameter: string;
  tons: number;
  percentOfTotal: number | null;
  percentOfProduction?: number | null;
}

export interface ExecutiveOffcutReportData {
  startDate: string;
  endDate: string;
  generatedOn: string;
  preparedBy: string;
  kpis: {
    productionTotalTons: number | null;
    offcutTotalTons: number;
    totalPieces: number;
    ytdOffcutTons: number;
    monthToMonthChange: {
      currentMonth: string | null;
      previousMonth: string | null;
      deltaTons: number | null;
      deltaPercent: number | null;
    };
  };
  productionBreakdown: {
    rows: BreakdownRow[];
    totalTons: number;
    available: boolean;
  };
  offcutBreakdown: {
    rows: BreakdownRow[];
    totalTons: number;
  };
  dailySeries: { date: string; tons: number }[];
  monthlySeries: { month: string; tons: number }[];
  highlights: {
    topDiameters: { diameter: string; tons: number }[];
    topClients: { name: string; tons: number }[];
    clientsAvailable: boolean;
  };
}

const diameterOrder = ['8', '10', '12', '14', '16', '18', '20', '25', '32'];

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const normalizeDiameter = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const match = value.match(/\d+/g);
  return match ? match.join('') : value.trim();
};

export const buildExecutiveOffcutReportData = ({
  startDate,
  endDate,
  offcutRows,
  productionRows = [],
  ytdOffcutRows = [],
  now
}: ExecutiveOffcutReportInput): ExecutiveOffcutReportData => {
  const offcutTotalTons = offcutRows.reduce(
    (sum, row) => sum + (Number.isFinite(row.weight_tons) ? row.weight_tons : 0),
    0
  );
  const totalPieces = offcutRows.reduce(
    (sum, row) => sum + (Number.isFinite(row.pieces_used) ? row.pieces_used : 0),
    0
  );
  const ytdOffcutTons = ytdOffcutRows.reduce(
    (sum, row) => sum + (Number.isFinite(row.weight_tons) ? row.weight_tons : 0),
    0
  );

  const productionTotals = diameterOrder.reduce((acc, diameter) => {
    acc[diameter] = 0;
    return acc;
  }, {} as Record<string, number>);

  productionRows.forEach((row) => {
    diameterOrder.forEach((diameter) => {
      const field = `breakdown_${diameter}mm` as keyof ProductionRow;
      const value = Number(row[field] ?? 0);
      if (Number.isFinite(value)) {
        productionTotals[diameter] += value;
      }
    });
  });

  const productionTotalTons = diameterOrder.reduce(
    (sum, diameter) => sum + productionTotals[diameter],
    0
  );

  const productionAvailable = productionTotalTons > 0;

  const productionBreakdownRows = diameterOrder.map((diameter) => {
    const tons = productionTotals[diameter];
    return {
      diameter,
      tons,
      percentOfTotal: productionTotalTons > 0 ? (tons / productionTotalTons) * 100 : null
    };
  });

  const offcutTotals = diameterOrder.reduce((acc, diameter) => {
    acc[diameter] = 0;
    return acc;
  }, {} as Record<string, number>);

  offcutRows.forEach((row) => {
    const diameter = normalizeDiameter(row.bar_diameter);
    if (!diameter || !(diameter in offcutTotals)) {
      return;
    }
    const value = Number(row.weight_tons ?? 0);
    if (Number.isFinite(value)) {
      offcutTotals[diameter] += value;
    }
  });

  const offcutBreakdownRows = diameterOrder.map((diameter) => {
    const tons = offcutTotals[diameter];
    return {
      diameter,
      tons,
      percentOfTotal: offcutTotalTons > 0 ? (tons / offcutTotalTons) * 100 : null,
      percentOfProduction:
        productionTotalTons > 0 ? (tons / productionTotalTons) * 100 : null
    };
  });

  const dailyMap = new Map<string, number>();
  offcutRows.forEach((row) => {
    if (!row.date) return;
    const key = row.date;
    dailyMap.set(key, (dailyMap.get(key) || 0) + (row.weight_tons || 0));
  });

  const dailySeries = Array.from(dailyMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, tons]) => ({
      date,
      tons
    }));

  const monthlyMap = new Map<string, number>();
  offcutRows.forEach((row) => {
    if (!row.date) return;
    const monthKey = row.date.slice(0, 7);
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (row.weight_tons || 0));
  });

  const monthlySeries = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, tons]) => ({
      month,
      tons
    }));

  let monthToMonth = {
    currentMonth: null as string | null,
    previousMonth: null as string | null,
    deltaTons: null as number | null,
    deltaPercent: null as number | null
  };

  if (monthlySeries.length >= 2) {
    const current = monthlySeries[monthlySeries.length - 1];
    const previous = monthlySeries[monthlySeries.length - 2];
    const deltaTons = current.tons - previous.tons;
    const deltaPercent = previous.tons > 0 ? (deltaTons / previous.tons) * 100 : null;
    monthToMonth = {
      currentMonth: current.month,
      previousMonth: previous.month,
      deltaTons,
      deltaPercent
    };
  }

  const topDiameters = [...offcutBreakdownRows]
    .sort((a, b) => b.tons - a.tons)
    .filter((row) => row.tons > 0)
    .slice(0, 3)
    .map((row) => ({ diameter: row.diameter, tons: row.tons }));

  const clientsAvailable = offcutRows.some((row) => row.company?.trim());
  const clientMap = new Map<string, number>();
  offcutRows.forEach((row) => {
    const company = row.company?.trim();
    if (!company) return;
    clientMap.set(company, (clientMap.get(company) || 0) + (row.weight_tons || 0));
  });
  const topClients = clientsAvailable
    ? Array.from(clientMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, tons]) => ({ name, tons }))
    : [];

  return {
    startDate,
    endDate,
    generatedOn: formatDate(now),
    preparedBy: 'Cut-And-bend Division',
    kpis: {
      productionTotalTons: productionAvailable ? productionTotalTons : null,
      offcutTotalTons,
      totalPieces,
      ytdOffcutTons,
      monthToMonthChange: monthToMonth
    },
    productionBreakdown: {
      rows: productionBreakdownRows,
      totalTons: productionTotalTons,
      available: productionAvailable
    },
    offcutBreakdown: {
      rows: offcutBreakdownRows,
      totalTons: offcutTotalTons
    },
    dailySeries,
    monthlySeries,
    highlights: {
      topDiameters,
      topClients,
      clientsAvailable
    }
  };
};

// How to use: buildExecutiveOffcutReportData() receives filtered offcut rows plus
// production rows and returns a structured summary for the print-ready report.
