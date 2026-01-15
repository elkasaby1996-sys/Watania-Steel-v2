import { OffcutUsageEntry } from '@/lib/supabase';

export interface TrendPoint {
  date: string;
  tons: number;
}

export interface BreakdownItem {
  label: string;
  tons: number;
  share: number;
}

export interface TableItem {
  name: string;
  tons: number;
  share: number;
}

export interface ExecutiveOffcutReportData {
  totalTons: number;
  totalPieces: number;
  entryCount: number;
  averageTonsPerEntry: number;
  uniqueClients: number;
  uniqueSites: number;
  topDiameter: BreakdownItem | null;
  exceptionsCount: number;
  trendSeries: TrendPoint[];
  diameterBreakdown: BreakdownItem[];
  topClients: TableItem[];
  topSites: TableItem[];
  insights: string[];
  actions: string[];
}

export interface ExecutiveReportMeta {
  dateRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
}

const formatNumber = (value: number, decimals = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const normalizeLabel = (value?: string | null) =>
  value?.toString().trim() || '';

const getOptionalField = (entry: OffcutUsageEntry, keys: string[]) => {
  const record = entry as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export const buildExecutiveOffcutReportData = (
  entries: OffcutUsageEntry[]
): ExecutiveOffcutReportData => {
  let totalTons = 0;
  let totalPieces = 0;
  let exceptionsCount = 0;

  const trendMap = new Map<string, number>();
  const diameterMap = new Map<string, number>();
  const clientMap = new Map<string, number>();
  const siteMap = new Map<string, number>();

  entries.forEach((entry) => {
    const date = normalizeLabel(entry.date);
    const diameter = normalizeLabel(entry.bar_diameter);
    const client = normalizeLabel(entry.company);
    const site = normalizeLabel(
      getOptionalField(entry, ['site', 'site_name', 'location', 'facility'])
    );

    const weightTons = Number(entry.weight_tons);
    const pieces = Number(entry.pieces_used);

    const missingCore = !date || !diameter || !client || !Number.isFinite(weightTons);
    if (missingCore) {
      exceptionsCount += 1;
    }

    if (Number.isFinite(weightTons)) {
      totalTons += weightTons;
      if (date) {
        trendMap.set(date, (trendMap.get(date) || 0) + weightTons);
      }
      if (diameter) {
        diameterMap.set(diameter, (diameterMap.get(diameter) || 0) + weightTons);
      }
      if (client) {
        clientMap.set(client, (clientMap.get(client) || 0) + weightTons);
      }
      if (site) {
        siteMap.set(site, (siteMap.get(site) || 0) + weightTons);
      }
    }

    if (Number.isFinite(pieces)) {
      totalPieces += pieces;
    }
  });

  const entryCount = entries.length;
  const averageTonsPerEntry = entryCount > 0 ? totalTons / entryCount : 0;

  const trendSeries = Array.from(trendMap.entries())
    .map(([date, tons]) => ({ date, tons }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const diameterBreakdown = Array.from(diameterMap.entries())
    .map(([label, tons]) => ({
      label,
      tons,
      share: totalTons > 0 ? (tons / totalTons) * 100 : 0
    }))
    .sort((a, b) => b.tons - a.tons);

  const topDiameter = diameterBreakdown[0] || null;

  const topClients = Array.from(clientMap.entries())
    .map(([name, tons]) => ({
      name,
      tons,
      share: totalTons > 0 ? (tons / totalTons) * 100 : 0
    }))
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 10);

  const topSites = Array.from(siteMap.entries())
    .map(([name, tons]) => ({
      name,
      tons,
      share: totalTons > 0 ? (tons / totalTons) * 100 : 0
    }))
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 10);

  const insights: string[] = [];
  if (topDiameter) {
    insights.push(
      `${topDiameter.label} accounts for ${formatNumber(topDiameter.share, 1)}% of total tons.`
    );
  }
  if (topClients[0]) {
    insights.push(
      `${topClients[0].name} represents ${formatNumber(topClients[0].share, 1)}% of usage.`
    );
  }
  if (trendSeries.length > 0) {
    const peak = trendSeries.reduce((max, current) =>
      current.tons > max.tons ? current : max
    );
    insights.push(`Peak usage was ${formatNumber(peak.tons, 2)} tons on ${peak.date}.`);
  }
  if (exceptionsCount > 0) {
    insights.push(`${exceptionsCount} entries had missing or incomplete fields.`);
  }

  const actions = [
    'Validate data entry completeness for diameter and client fields.',
    'Review top client demand and align inventory planning.',
    'Monitor peak days to balance production capacity.'
  ];

  return {
    totalTons: formatNumber(totalTons, 3),
    totalPieces,
    entryCount,
    averageTonsPerEntry: formatNumber(averageTonsPerEntry, 3),
    uniqueClients: clientMap.size,
    uniqueSites: siteMap.size,
    topDiameter,
    exceptionsCount,
    trendSeries,
    diameterBreakdown,
    topClients,
    topSites,
    insights: insights.slice(0, 5),
    actions
  };
};
