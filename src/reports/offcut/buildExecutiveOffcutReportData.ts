import type { OffcutUsageEntry } from '@/lib/supabase';

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
  pieces?: number;
  percentOfTotal: number | null;
  percentOfProduction?: number | null;
}

export interface ExecutiveOffcutReportData {
  version?: number;
  startDate: string;
  endDate: string;
  generatedOn: string;
  generatedAt?: string;
  preparedBy: string;
  coverage?: {
    entryCount: number;
    productionRecordCount: number;
    productionStatus: 'available' | 'empty' | 'unavailable';
    ytdStartDate: string;
    ytdEndDate: string;
    unassignedClientTons: number;
    invalidWeightCount: number;
  };
  kpis: {
    productionTotalTons: number | null;
    offcutTotalTons: number;
    totalPieces: number;
    ytdOffcutTons: number | null;
    monthToMonthChange: {
      currentMonth: string | null;
      previousMonth: string | null;
      deltaTons: number | null;
      deltaPercent: number | null;
    };
  };
  productionBreakdown: { rows: BreakdownRow[]; totalTons: number; available: boolean };
  offcutBreakdown: { rows: BreakdownRow[]; totalTons: number };
  dailySeries: { date: string; tons: number }[];
  monthlySeries: { month: string; tons: number }[];
  highlights: {
    topDiameters: { diameter: string; tons: number }[];
    topClients: { name: string; tons: number }[];
    clientsAvailable: boolean;
  };
}

export const DIAMETERS = ['8', '10', '12', '14', '16', '18', '20', '25', '32'];
const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateKey = (value: string) => value.slice(0, 10);
const inRange = (date: string, start: string, end: string) => dateKey(date) >= start && dateKey(date) <= end;
const sumTons = (rows: OffcutUsageEntry[]) => rows.reduce((sum, row) => sum + numeric(row.weight_tons), 0);

export function buildExecutiveOffcutReportData({ startDate, endDate, offcutRows, productionRows, ytdOffcutRows, now }: ExecutiveOffcutReportInput): ExecutiveOffcutReportData {
  const rows = offcutRows.filter(row => inRange(row.date, startDate, endDate));
  const production = productionRows?.filter(row => inRange(row.date, startDate, endDate) && (!row.order_type || row.order_type === 'cut-and-bend'));
  const ytdStartDate = `${endDate.slice(0, 4)}-01-01`;
  const offcutTotalTons = sumTons(rows);
  const totalPieces = rows.reduce((sum, row) => sum + numeric(row.pieces_used), 0);
  const ytdOffcutTons = ytdOffcutRows ? sumTons(ytdOffcutRows.filter(row => inRange(row.date, ytdStartDate, endDate))) : null;
  const productionTotals = Object.fromEntries(DIAMETERS.map(diameter => [diameter, 0]));
  production?.forEach(row => DIAMETERS.forEach(diameter => {
    productionTotals[diameter] += numeric(row[`breakdown_${diameter}mm` as keyof ProductionRow]);
  }));
  // Use the same diameter quantities in the denominator and the material table.
  const productionTotal = Object.values(productionTotals).reduce((sum, tons) => sum + tons, 0);
  const productionAvailable = production !== undefined;
  const offcutTotals = new Map<string, { tons: number; pieces: number }>(DIAMETERS.map(d => [d, { tons: 0, pieces: 0 }]));
  const dailyMap = new Map<string, number>();
  const clientMap = new Map<string, number>();
  let unassignedClientTons = 0;
  rows.forEach(row => {
    const normalized = String(row.bar_diameter || '').trim().replace(/^(?:ø|Ø|dia\.?\s*)/i, '').replace(/\s*mm$/i, '').trim();
    const diameter = DIAMETERS.includes(normalized) ? normalized : 'Other';
    const material = offcutTotals.get(diameter) || { tons: 0, pieces: 0 };
    const tons = numeric(row.weight_tons);
    material.tons += tons;
    material.pieces += numeric(row.pieces_used);
    offcutTotals.set(diameter, material);
    const date = dateKey(row.date);
    dailyMap.set(date, (dailyMap.get(date) || 0) + tons);
    const company = row.company?.trim();
    if (company) clientMap.set(company, (clientMap.get(company) || 0) + tons);
    else unassignedClientTons += tons;
  });
  const dailySeries = [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, tons]) => ({ date, tons }));
  const monthlyMap = new Map<string, number>();
  dailySeries.forEach(({ date, tons }) => monthlyMap.set(date.slice(0, 7), (monthlyMap.get(date.slice(0, 7)) || 0) + tons));
  const monthlySeries = [...monthlyMap].map(([month, tons]) => ({ month, tons }));
  const offcutBreakdownRows = [...offcutTotals].map(([diameter, { tons, pieces }]) => ({
    diameter, tons, pieces,
    percentOfTotal: offcutTotalTons > 0 ? tons / offcutTotalTons * 100 : null,
    percentOfProduction: productionTotal > 0 ? tons / productionTotal * 100 : null,
  }));
  // A month-to-month comparison is valid only for two adjacent, complete months.
  let monthToMonthChange: ExecutiveOffcutReportData['kpis']['monthToMonthChange'] = { currentMonth: null, previousMonth: null, deltaTons: null, deltaPercent: null };
  if (monthlySeries.length >= 2) {
    const current = monthlySeries[monthlySeries.length - 1];
    const previous = monthlySeries[monthlySeries.length - 2];
    const [year, month] = current.month.split('-').map(Number);
    const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
    const currentMonthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    if (previous.month === previousMonth && startDate <= previous.month + '-01' && endDate >= currentMonthEnd && now.toISOString().slice(0, 10) >= currentMonthEnd) {
      const deltaTons = current.tons - previous.tons;
      monthToMonthChange = { currentMonth: current.month, previousMonth: previous.month, deltaTons, deltaPercent: previous.tons > 0 ? deltaTons / previous.tons * 100 : null };
    }
  }
  return {
    version: 2, startDate, endDate,
    generatedOn: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    generatedAt: now.toISOString(), preparedBy: 'Cut-and-Bend Division',
    coverage: {
      entryCount: rows.length, productionRecordCount: production?.length || 0,
      productionStatus: production === undefined ? 'unavailable' : production.length ? 'available' : 'empty',
      ytdStartDate, ytdEndDate: endDate, unassignedClientTons,
      invalidWeightCount: rows.filter(row => row.weight_tons == null || !Number.isFinite(Number(row.weight_tons))).length,
    },
    kpis: { productionTotalTons: productionAvailable ? productionTotal : null, offcutTotalTons, totalPieces, ytdOffcutTons, monthToMonthChange },
    productionBreakdown: {
      rows: DIAMETERS.map(diameter => ({ diameter, tons: productionTotals[diameter], percentOfTotal: productionTotal > 0 ? productionTotals[diameter] / productionTotal * 100 : null })),
      totalTons: productionTotal, available: productionAvailable,
    },
    offcutBreakdown: { rows: offcutBreakdownRows, totalTons: offcutTotalTons }, dailySeries, monthlySeries,
    highlights: {
      topDiameters: [...offcutBreakdownRows].filter(row => row.tons > 0).sort((a, b) => b.tons - a.tons).slice(0, 3).map(({ diameter, tons }) => ({ diameter, tons })),
      topClients: [...clientMap].sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, tons]) => ({ name, tons })),
      clientsAvailable: clientMap.size > 0,
    },
  };
}
