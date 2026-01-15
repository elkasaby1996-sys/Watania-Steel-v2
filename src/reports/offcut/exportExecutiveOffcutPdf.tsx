import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import {
  ExecutiveOffcutReport,
  ExecutiveReportData,
  ExecutiveReportMeta,
  createTrendSeries
} from './ExecutiveOffcutReport';
import { OffcutUsageEntry } from '@/lib/supabase';

const formatTons = (value: number) => Number(value.toFixed(3));
const formatPct = (value: number) => Number(value.toFixed(1));

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

const buildExecutiveReportData = (
  entries: OffcutUsageEntry[],
  dateRange: ExecutiveReportMeta['dateRange']
): ExecutiveReportData => {
  let totalTons = 0;
  let entryCount = 0;

  const daySet = new Set<string>();
  const diameterMap = new Map<string, number>();
  const clientMap = new Map<string, { tons: number; orders: number }>();
  const siteMap = new Map<
    string,
    { tons: number; orders: number; clientCounts: Map<string, number> }
  >();

  const exceptions = {
    missingClient: 0,
    missingSite: 0,
    missingShift: 0,
    missingDiameter: 0,
    mismatchCount: 0
  };

  const trendEntries: { date: string; tons: number }[] = [];

  entries.forEach((entry) => {
    const date = entry.date?.trim();
    const diameter = entry.bar_diameter?.trim();
    const client = entry.company?.trim();
    const site = getOptionalField(entry, ['site', 'site_name', 'location', 'facility']);
    const shift = getOptionalField(entry, ['shift', 'machine', 'machine_shift']);
    const tons = Number(entry.weight_tons);

    entryCount += 1;

    if (!client) {
      exceptions.missingClient += 1;
    }
    if (!site) {
      exceptions.missingSite += 1;
    }
    if (!shift) {
      exceptions.missingShift += 1;
    }
    if (!diameter) {
      exceptions.missingDiameter += 1;
    }

    const mismatch = !diameter || !Number.isFinite(tons);
    if (mismatch) {
      exceptions.mismatchCount += 1;
    }

    if (Number.isFinite(tons)) {
      totalTons += tons;
      if (date) {
        daySet.add(date);
        trendEntries.push({ date, tons });
      }
      if (diameter) {
        diameterMap.set(diameter, (diameterMap.get(diameter) || 0) + tons);
      }
      if (client) {
        const existing = clientMap.get(client) || { tons: 0, orders: 0 };
        clientMap.set(client, { tons: existing.tons + tons, orders: existing.orders + 1 });
      }
      if (site) {
        const existing = siteMap.get(site) || {
          tons: 0,
          orders: 0,
          clientCounts: new Map<string, number>()
        };
        const clientKey = client || 'Unknown';
        existing.clientCounts.set(
          clientKey,
          (existing.clientCounts.get(clientKey) || 0) + 1
        );
        siteMap.set(site, {
          tons: existing.tons + tons,
          orders: existing.orders + 1,
          clientCounts: existing.clientCounts
        });
      }
    }
  });

  const diameterBreakdown = Array.from(diameterMap.entries())
    .map(([label, tons]) => ({
      label,
      tons: formatTons(tons),
      share: totalTons > 0 ? formatPct((tons / totalTons) * 100) : 0
    }))
    .sort((a, b) => b.tons - a.tons);

  const sumDiameterTons = diameterBreakdown.reduce((sum, row) => sum + row.tons, 0);
  const mismatchDetected =
    diameterBreakdown.length > 0 && Math.abs(totalTons - sumDiameterTons) > 0.01;

  const topClients = Array.from(clientMap.entries())
    .map(([name, values]) => ({
      name,
      orders: values.orders,
      tons: formatTons(values.tons),
      share: totalTons > 0 ? formatPct((values.tons / totalTons) * 100) : 0
    }))
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 10);

  const topSites = Array.from(siteMap.entries())
    .map(([name, values]) => {
      const topClient = Array.from(values.clientCounts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0];
      return {
        name,
        clientName: topClient?.[0] || '-',
        orders: values.orders,
        tons: formatTons(values.tons),
        share: totalTons > 0 ? formatPct((values.tons / totalTons) * 100) : 0
      };
    })
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 10);

  const activeDays = daySet.size;
  const averagePerDay = activeDays > 0 ? totalTons / activeDays : 0;

  const trend = createTrendSeries(trendEntries, dateRange.start, dateRange.end);

  const insights: string[] = [];
  if (diameterBreakdown[0]) {
    insights.push(
      `${diameterBreakdown[0].label} leads at ${formatPct(diameterBreakdown[0].share)} of total offcut.`
    );
  }
  if (topClients[0]) {
    insights.push(
      `${topClients[0].name} contributes ${formatPct(topClients[0].share)} of offcut tons.`
    );
  }
  if (topSites[0]) {
    insights.push(
      `${topSites[0].name} is the highest offcut site at ${formatPct(topSites[0].share)}.`
    );
  }
  if (trend.length > 0) {
    const peak = trend.reduce((max, current) => (current.tons > max.tons ? current : max));
    insights.push(`Peak usage was ${formatTons(peak.tons)} tons (${peak.label}).`);
  }
  if (exceptions.mismatchCount > 0) {
    insights.push(`${exceptions.mismatchCount} records have incomplete breakdown data.`);
  }

  const actions = [
    'Review dominant diameter demand to align cutting schedules.',
    'Focus quality checks on top client and site drivers.',
    'Improve capture of site/shift details to reduce exceptions.'
  ];

  return {
    totalTons: formatTons(totalTons),
    entryCount,
    activeDays,
    averagePerDay: formatTons(averagePerDay),
    trend,
    diameterBreakdown,
    topClients,
    topSites,
    exceptions,
    insights: insights.slice(0, 6),
    actions: actions.slice(0, 5),
    mismatchDetected
  };
};

export const exportExecutiveOffcutPdf = async (
  entries: OffcutUsageEntry[],
  meta: ExecutiveReportMeta
) => {
  const reportData = buildExecutiveReportData(entries, meta.dateRange);
  const document = <ExecutiveOffcutReport data={reportData} meta={meta} />;
  const blob = await pdf(document).toBlob();
  const filename = `Offcut_Executive_Report_${meta.dateRange.start}_to_${meta.dateRange.end}.pdf`;
  saveAs(blob, filename);
};
