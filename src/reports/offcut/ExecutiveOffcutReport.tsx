import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Polyline
} from '@react-pdf/renderer';

export interface ExecutiveReportMeta {
  dateRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
  preparedBy: string;
  includeAppendix?: boolean;
}

export interface TrendPoint {
  label: string;
  tons: number;
}

export interface BreakdownRow {
  label: string;
  tons: number;
  share: number;
}

export interface RankedRow {
  name: string;
  orders: number;
  tons: number;
  share: number;
  clientName?: string;
}

export interface ExceptionsSummary {
  missingClient: number;
  missingSite: number;
  missingShift: number;
  missingDiameter: number;
  mismatchCount: number;
}

export interface ExecutiveReportData {
  totalTons: number;
  entryCount: number;
  activeDays: number;
  averagePerDay: number;
  trend: TrendPoint[];
  diameterBreakdown: BreakdownRow[];
  topClients: RankedRow[];
  topSites: RankedRow[];
  exceptions: ExceptionsSummary;
  insights: string[];
  actions: string[];
  offcutPercent?: number;
  totalPieces?: number;
  mismatchDetected: boolean;
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLeft: {
    width: '22%',
    justifyContent: 'center'
  },
  logoBox: {
    width: 60,
    height: 28,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerCenter: {
    width: '56%',
    alignItems: 'center'
  },
  headerRight: {
    width: '22%',
    alignItems: 'flex-end'
  },
  title: {
    fontSize: 16,
    fontWeight: 700
  },
  subtitle: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2
  },
  section: {
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 8
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8
  },
  kpiCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    flex: 1
  },
  kpiLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 4
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: 700
  },
  chartCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    flex: 1
  },
  insightsCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    flex: 1
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  bulletSymbol: {
    width: 10
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  cell: {
    flex: 1,
    fontSize: 9
  },
  cellRight: {
    flex: 0.4,
    textAlign: 'right',
    fontSize: 9
  },
  cellSmallRight: {
    flex: 0.3,
    textAlign: 'right',
    fontSize: 9
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    fontSize: 8,
    color: '#94a3b8',
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

const formatTons = (value: number) => value.toFixed(3);
const formatPct = (value: number) => `${value.toFixed(1)}%`;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

const InsightList = ({ items }: { items: string[] }) => (
  <View>
    {items.map((item) => (
      <View key={item} style={styles.bulletRow}>
        <Text style={styles.bulletSymbol}>•</Text>
        <Text>{item}</Text>
      </View>
    ))}
  </View>
);

const Header = ({ meta }: { meta: ExecutiveReportMeta }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.logoBox}>
        <Text style={{ fontSize: 7, color: '#94a3b8' }}>Logo</Text>
      </View>
    </View>
    <View style={styles.headerCenter}>
      <Text style={styles.title}>Offcut Executive Report</Text>
      <Text style={styles.subtitle}>Factory Management System</Text>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.subtitle}>Range</Text>
      <Text>{`${meta.dateRange.start} → ${meta.dateRange.end}`}</Text>
      <Text style={styles.subtitle}>Generated</Text>
      <Text>{meta.generatedAt}</Text>
      <Text style={styles.subtitle}>Prepared By</Text>
      <Text>{meta.preparedBy}</Text>
    </View>
  </View>
);

const Footer = () => (
  <Text
    style={styles.footer}
    render={({ pageNumber, totalPages }) =>
      `Factory Management System • Offcut Executive Report • Page ${pageNumber}/${totalPages}`
    }
    fixed
  />
);

const SimpleLineChartSvg = ({ data }: { data: TrendPoint[] }) => {
  const width = 260;
  const height = 110;
  const padding = 18;
  if (!data.length) {
    return (
      <View>
        <Text>No trend data available.</Text>
      </View>
    );
  }
  const values = data.map((point) => point.tons);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = data
    .map((point, index) => {
      const x =
        padding +
        (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y =
        padding +
        (1 - (point.tons - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill="#ffffff" stroke="#e2e8f0" />
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#cbd5f5"
        strokeWidth={1}
      />
      <Line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#cbd5f5"
        strokeWidth={1}
      />
      <Polyline points={points} fill="none" stroke="#2563eb" strokeWidth={2} />
    </Svg>
  );
};

const SimpleBarChartSvg = ({ data }: { data: BreakdownRow[] }) => {
  const width = 200;
  const height = 140;
  const padding = 12;
  if (!data.length) {
    return (
      <View>
        <Text>Diameter breakdown not available.</Text>
      </View>
    );
  }
  const max = Math.max(...data.map((row) => row.tons), 0);
  const barWidth = (width - padding * 2) / data.length;
  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill="#ffffff" stroke="#e2e8f0" />
      {data.map((row, index) => {
        const barHeight = max > 0 ? (row.tons / max) * (height - padding * 2) : 0;
        const x = padding + index * barWidth + 4;
        const y = height - padding - barHeight;
        return (
          <Rect
            key={row.label}
            x={x}
            y={y}
            width={barWidth - 8}
            height={barHeight}
            fill="#0f766e"
          />
        );
      })}
    </Svg>
  );
};

const Table = ({
  columns,
  rows
}: {
  columns: { label: string; align?: 'left' | 'right'; width?: number }[];
  rows: (string | number)[][];
}) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {columns.map((column) => (
        <Text
          key={column.label}
          style={[
            styles.cell,
            column.align === 'right' && { textAlign: 'right' },
            column.width ? { flex: column.width } : null
          ]}
        >
          {column.label}
        </Text>
      ))}
    </View>
    {rows.map((row, index) => (
      <View key={`${row[0]}-${index}`} style={styles.tableRow}>
        {row.map((cell, cellIndex) => {
          const column = columns[cellIndex];
          return (
            <Text
              key={`${cell}-${cellIndex}`}
              style={[
                styles.cell,
                column?.align === 'right' && { textAlign: 'right' },
                column?.width ? { flex: column.width } : null
              ]}
            >
              {cell}
            </Text>
          );
        })}
      </View>
    ))}
  </View>
);

export const ExecutiveOffcutReport = ({
  data,
  meta
}: {
  data: ExecutiveReportData;
  meta: ExecutiveReportMeta;
}) => {
  const kpiCards = [
    { label: 'Total Offcut Tons', value: `${formatTons(data.totalTons)} tons` },
    data.offcutPercent !== undefined
      ? { label: 'Offcut %', value: formatPct(data.offcutPercent) }
      : null,
    { label: 'Total Entries', value: data.entryCount.toLocaleString() },
    {
      label: 'Active Days',
      value: `${data.activeDays} • ${formatTons(data.averagePerDay)} / day`
    }
  ].filter(Boolean) as { label: string; value: string }[];

  const diameterRows = data.diameterBreakdown.map((row) => [
    row.label,
    formatTons(row.tons),
    formatPct(row.share)
  ]);

  const clientRows = data.topClients.map((row) => [
    row.name,
    row.orders.toLocaleString(),
    formatTons(row.tons),
    formatPct(row.share)
  ]);

  const siteRows = data.topSites.map((row) => [
    row.name,
    row.clientName || '-',
    row.orders.toLocaleString(),
    formatTons(row.tons),
    formatPct(row.share)
  ]);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Executive Summary</SectionTitle>
          <View style={styles.gridRow}>
            {kpiCards.map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} />
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.gridRow]}>
          <View style={styles.chartCard}>
            <SectionTitle>Offcut Tons Over Time</SectionTitle>
            <SimpleLineChartSvg data={data.trend} />
          </View>
          <View style={styles.insightsCard}>
            <SectionTitle>Key Insights</SectionTitle>
            <InsightList items={data.insights} />
            <View style={{ marginTop: 8 }}>
              <SectionTitle>Actions / Recommendations</SectionTitle>
              <InsightList items={data.actions} />
            </View>
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={[styles.section, styles.gridRow]}>
          <View style={{ flex: 1 }}>
            <SectionTitle>Diameter Breakdown</SectionTitle>
            {data.diameterBreakdown.length === 0 ? (
              <Text>Diameter breakdown not available.</Text>
            ) : (
              <Table
                columns={[
                  { label: 'Diameter' },
                  { label: 'Offcut Tons', align: 'right' },
                  { label: '% of Total', align: 'right' }
                ]}
                rows={diameterRows}
              />
            )}
          </View>
          <View style={styles.chartCard}>
            <SectionTitle>Distribution</SectionTitle>
            <SimpleBarChartSvg data={data.diameterBreakdown} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Top Clients</SectionTitle>
          <Table
            columns={[
              { label: 'Client', width: 1.4 },
              { label: 'Orders', align: 'right', width: 0.5 },
              { label: 'Offcut Tons', align: 'right', width: 0.7 },
              { label: '% of Total', align: 'right', width: 0.6 }
            ]}
            rows={clientRows}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>Top Sites</SectionTitle>
          <Table
            columns={[
              { label: 'Site', width: 1.2 },
              { label: 'Client', width: 1.2 },
              { label: 'Orders', align: 'right', width: 0.5 },
              { label: 'Offcut Tons', align: 'right', width: 0.7 },
              { label: '% of Total', align: 'right', width: 0.6 }
            ]}
            rows={siteRows}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>Exceptions</SectionTitle>
          <Text>
            Missing client: {data.exceptions.missingClient} • Missing site:{' '}
            {data.exceptions.missingSite} • Missing shift:{' '}
            {data.exceptions.missingShift} • Missing diameter:{' '}
            {data.exceptions.missingDiameter} • Mismatch count:{' '}
            {data.exceptions.mismatchCount}
          </Text>
          {data.mismatchDetected && (
            <Text style={{ marginTop: 4, color: '#b91c1c' }}>
              Total tons differ from diameter totals beyond tolerance.
            </Text>
          )}
        </View>
        <Footer />
      </Page>

      {meta.includeAppendix && (
        <Page size="A4" style={styles.page} wrap>
          <Header meta={meta} />
          <View style={styles.section}>
            <SectionTitle>Appendix</SectionTitle>
            <Text>
              Supplemental data available on request. This appendix is reserved for
              operational notes, variance explanations, and supporting data extracts.
            </Text>
          </View>
          <Footer />
        </Page>
      )}
    </Document>
  );
};

export const createTrendSeries = (
  entries: { date: string; tons: number }[],
  start: string,
  end: string
): TrendPoint[] => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dayDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const useWeekly = dayDiff > 45;
  const buckets = new Map<string, { date: Date; tons: number }>();

  const normalizeDate = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  entries.forEach((entry) => {
    const entryDate = normalizeDate(new Date(entry.date));
    const bucketDate = useWeekly
      ? new Date(entryDate.getTime() - entryDate.getDay() * 24 * 60 * 60 * 1000)
      : entryDate;
    const label = bucketDate.toISOString().slice(0, 10);
    const existing = buckets.get(label);
    buckets.set(label, {
      date: bucketDate,
      tons: (existing?.tons || 0) + entry.tons
    });
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([label, bucket]) => ({
      label: useWeekly ? `Week of ${formatDate(label)}` : formatDate(label),
      tons: bucket.tons
    }));
};
