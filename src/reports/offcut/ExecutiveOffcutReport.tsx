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
  plantName?: string;
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

const palette = {
  slate: '#0f172a',
  slateMuted: '#475569',
  border: '#e2e8f0',
  surface: '#ffffff',
  header: '#0b1b3a',
  highlight: '#e2e8f0',
  accent: '#1d4ed8',
  positive: '#15803d',
  negative: '#b91c1c'
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 34,
    paddingBottom: 44,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: palette.slate,
    backgroundColor: palette.surface
  },
  header: {
    marginBottom: 18
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: palette.header
  },
  headerSubtitle: {
    fontSize: 11,
    color: palette.slateMuted,
    marginTop: 4
  },
  headerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  headerMetaBlock: {
    flexDirection: 'column'
  },
  headerMetaLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: palette.slateMuted,
    marginBottom: 2
  },
  headerMetaValue: {
    fontSize: 9
  },
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 6
  },
  bodyText: {
    fontSize: 9,
    color: palette.slate
  },
  footnote: {
    fontSize: 7,
    color: palette.slateMuted,
    marginTop: 6
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10
  },
  kpiCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 10,
    flex: 1,
    minHeight: 56,
    justifyContent: 'space-between'
  },
  kpiLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: palette.slateMuted
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: 700
  },
  kpiDelta: {
    fontSize: 8,
    color: palette.slateMuted
  },
  highlightCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc'
  },
  chartCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    flex: 1
  },
  chartMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  chartLegend: {
    fontSize: 8,
    color: palette.slateMuted
  },
  chartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  axisLabel: {
    fontSize: 7,
    color: palette.slateMuted
  },
  table: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
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
    paddingHorizontal: 8
  },
  tableRowStriped: {
    backgroundColor: '#f8fafc'
  },
  cell: {
    flex: 1,
    fontSize: 9
  },
  cellRight: {
    textAlign: 'right'
  },
  cellEmphasis: {
    color: palette.negative,
    fontWeight: 600
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  bulletSymbol: {
    width: 10
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 34,
    right: 34,
    fontSize: 8,
    color: palette.slateMuted,
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

const SubSectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.subSectionTitle}>{children}</Text>
);

const KpiCard = ({
  label,
  value,
  delta
}: {
  label: string;
  value: string;
  delta?: string;
}) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    {delta ? <Text style={styles.kpiDelta}>{delta}</Text> : null}
  </View>
);

const InsightList = ({ items }: { items: string[] }) => (
  <View>
    {items.map((item) => (
      <View key={item} style={styles.bulletRow}>
        <Text style={styles.bulletSymbol}>•</Text>
        <Text style={styles.bodyText}>{item}</Text>
      </View>
    ))}
  </View>
);

const Header = ({ meta }: { meta: ExecutiveReportMeta }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Offcut Performance – Executive Summary</Text>
    <Text style={styles.headerSubtitle}>
      {`${formatDate(meta.dateRange.start)} – ${formatDate(meta.dateRange.end)}`}
    </Text>
    <View style={styles.headerMetaRow}>
      <View style={styles.headerMetaBlock}>
        <Text style={styles.headerMetaLabel}>Company / Plant</Text>
        <Text style={styles.headerMetaValue}>{meta.plantName || '—'}</Text>
      </View>
      <View style={styles.headerMetaBlock}>
        <Text style={styles.headerMetaLabel}>Generated</Text>
        <Text style={styles.headerMetaValue}>{meta.generatedAt}</Text>
      </View>
      <View style={styles.headerMetaBlock}>
        <Text style={styles.headerMetaLabel}>Prepared by</Text>
        <Text style={styles.headerMetaValue}>{meta.preparedBy}</Text>
      </View>
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
  const width = 250;
  const height = 120;
  const padding = 20;
  if (!data.length) {
    return (
      <View>
        <Text style={styles.bodyText}>No trend data available.</Text>
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
      <Rect width={width} height={height} fill="#ffffff" stroke={palette.border} />
      {[0, 1, 2, 3].map((line) => {
        const y = padding + (line / 3) * (height - padding * 2);
        return (
          <Line
            key={`grid-${line}`}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth={0.6}
          />
        );
      })}
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
      <Polyline points={points} fill="none" stroke={palette.accent} strokeWidth={2} />
    </Svg>
  );
};

const SimpleBarChartSvg = ({ data }: { data: BreakdownRow[] }) => {
  const width = 230;
  const height = 130;
  const padding = 16;
  if (!data.length) {
    return (
      <View>
        <Text style={styles.bodyText}>Data not available.</Text>
      </View>
    );
  }
  const max = Math.max(...data.map((row) => row.tons), 0);
  const barWidth = (width - padding * 2) / data.length;
  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill="#ffffff" stroke={palette.border} />
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

const ChartBlock = ({
  title,
  subtitle,
  xLabel,
  yLabel,
  legend,
  children
}: {
  title: string;
  subtitle?: string;
  xLabel: string;
  yLabel: string;
  legend: string;
  children: React.ReactNode;
}) => (
  <View style={styles.chartCard}>
    <View style={styles.chartMetaRow}>
      <View>
        <Text style={styles.subSectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.chartLegend}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chartLegend}>{legend}</Text>
    </View>
    {children}
    <View style={styles.chartAxisRow}>
      <Text style={styles.axisLabel}>{yLabel}</Text>
      <Text style={styles.axisLabel}>{xLabel}</Text>
    </View>
  </View>
);

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
            column.align === 'right' && styles.cellRight,
            column.width ? { flex: column.width } : null
          ]}
        >
          {column.label}
        </Text>
      ))}
    </View>
    {rows.map((row, index) => (
      <View
        key={`${row[0]}-${index}`}
        style={[styles.tableRow, index % 2 === 1 && styles.tableRowStriped]}
      >
        {row.map((cell, cellIndex) => {
          const column = columns[cellIndex];
          return (
            <Text
              key={`${cell}-${cellIndex}`}
              style={[
                styles.cell,
                column?.align === 'right' && styles.cellRight,
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

const SitePerformanceTable = ({ rows }: { rows: RankedRow[] }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {[
        { label: 'Site Name', width: 1.4 },
        { label: 'Orders', align: 'right', width: 0.5 },
        { label: 'Production (t)', align: 'right', width: 0.6 },
        { label: 'Offcut (t)', align: 'right', width: 0.6 },
        { label: 'Offcut %', align: 'right', width: 0.5 }
      ].map((column) => (
        <Text
          key={column.label}
          style={[
            styles.cell,
            column.align === 'right' && styles.cellRight,
            column.width ? { flex: column.width } : null
          ]}
        >
          {column.label}
        </Text>
      ))}
    </View>
    {rows.map((row, index) => {
      const offcutPct = row.share;
      return (
        <View
          key={`${row.name}-${index}`}
          style={[styles.tableRow, index % 2 === 1 && styles.tableRowStriped]}
        >
          <Text style={[styles.cell, { flex: 1.4 }]}>{row.name}</Text>
          <Text style={[styles.cell, styles.cellRight, { flex: 0.5 }]}>
            {row.orders.toLocaleString()}
          </Text>
          <Text style={[styles.cell, styles.cellRight, { flex: 0.6 }]}>—</Text>
          <Text style={[styles.cell, styles.cellRight, { flex: 0.6 }]}>
            {formatTons(row.tons)} t
          </Text>
          <Text
            style={[
              styles.cell,
              styles.cellRight,
              { flex: 0.5 },
              offcutPct > 15 ? styles.cellEmphasis : null
            ]}
          >
            {formatPct(offcutPct)}
          </Text>
        </View>
      );
    })}
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
    { label: 'Total Production (t)', value: '—' },
    { label: 'Total Offcut (t)', value: formatTons(data.totalTons) },
    data.offcutPercent !== undefined
      ? { label: 'Offcut Rate (%)', value: formatPct(data.offcutPercent) }
      : { label: 'Offcut Rate (%)', value: '—' },
    { label: 'Estimated Cost of Offcut', value: '—' },
    { label: 'MoM Change', value: '—' }
  ].slice(0, 5);
  const kpiRows = [kpiCards.slice(0, 3), kpiCards.slice(3)];

  const executiveHighlights = data.insights.length
    ? data.insights.slice(0, 3)
    : [
        'Offcut trend insights will appear once trend data is available.',
        'Top driver analysis requires complete operation metadata.'
      ];

  const trendInsight = data.trend.length
    ? `Offcut peaked at ${formatTons(
        Math.max(...data.trend.map((point) => point.tons), 0)
      )} t, with volatility stabilizing toward period end.`
    : 'Trend analysis not available for this period.';

  const diameterRows = data.diameterBreakdown.map((row) => [
    row.label,
    `${formatTons(row.tons)} t`,
    formatPct(row.share)
  ]);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Executive Summary</SectionTitle>
          {kpiRows.map((row, index) => (
            <View
              key={`kpi-row-${index}`}
              style={[styles.gridRow, index > 0 && { marginTop: 10 }]}
            >
              {row.map((card) => (
                <KpiCard key={card.label} label={card.label} value={card.value} />
              ))}
            </View>
          ))}
          <Text style={styles.footnote}>
            Production, cost, and month-over-month metrics require production ledger
            integration.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionTitle>Executive Highlights</SectionTitle>
          <View style={styles.highlightCard}>
            <InsightList items={executiveHighlights} />
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Offcut Trend Analysis</SectionTitle>
          <View style={styles.gridRow}>
            <ChartBlock
              title="Offcut Over Time"
              subtitle="Smoothed daily / weekly trend"
              xLabel="Date"
              yLabel="Offcut (t)"
              legend="Series: Offcut"
            >
              <SimpleLineChartSvg data={data.trend} />
            </ChartBlock>
            <ChartBlock
              title="Offcut Rate Over Time"
              subtitle="Benchmark vs actual"
              xLabel="Date"
              yLabel="Offcut (%)"
              legend="Series: Offcut Rate"
            >
              <View>
                <Text style={styles.bodyText}>Offcut rate trend not available.</Text>
              </View>
            </ChartBlock>
          </View>
        </View>
        <View style={styles.section}>
          <SectionTitle>Insight</SectionTitle>
          <View style={styles.highlightCard}>
            <Text style={styles.bodyText}>{trendInsight}</Text>
            <Text style={styles.bodyText}>
              Focus on week-to-week variance drivers once operation metadata is
              available.
            </Text>
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Operational Breakdown</SectionTitle>
          <View style={styles.gridRow}>
            <ChartBlock
              title="Offcut by Operation Type"
              subtitle="Cut & Bend vs Straight Bar"
              xLabel="Operation Type"
              yLabel="Offcut (t)"
              legend="Series: Offcut"
            >
              <View>
                <Text style={styles.bodyText}>
                  Operation-type data not available for this period.
                </Text>
              </View>
            </ChartBlock>
            <ChartBlock
              title="Offcut by Diameter"
              subtitle="Top diameters by volume"
              xLabel="Diameter (mm)"
              yLabel="Offcut (t)"
              legend="Series: Offcut"
            >
              <SimpleBarChartSvg data={data.diameterBreakdown} />
            </ChartBlock>
          </View>
        </View>
        <View style={styles.section}>
          <SubSectionTitle>Diameter Mix (Top Sizes)</SubSectionTitle>
          {data.diameterBreakdown.length === 0 ? (
            <Text style={styles.bodyText}>Diameter breakdown not available.</Text>
          ) : (
            <Table
              columns={[
                { label: 'Diameter (mm)' },
                { label: 'Offcut (t)', align: 'right' },
                { label: '% of Offcut', align: 'right' }
              ]}
              rows={diameterRows}
            />
          )}
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Site Performance</SectionTitle>
          {data.topSites.length === 0 ? (
            <Text style={styles.bodyText}>Site performance data not available.</Text>
          ) : (
            <SitePerformanceTable rows={data.topSites} />
          )}
          <Text style={styles.footnote}>
            Production totals unavailable; offcut % reflects share of total offcut.
          </Text>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Root Cause Indicators</SectionTitle>
          <View style={styles.highlightCard}>
            <Text style={styles.bodyText}>Data not available for this period.</Text>
            <Text style={styles.bodyText}>
              Capture shift, machine, and operator metadata to surface root cause
              patterns.
            </Text>
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header meta={meta} />
        <View style={styles.section}>
          <SectionTitle>Executive Recommendations</SectionTitle>
          <View style={styles.highlightCard}>
            <SubSectionTitle>Immediate Actions (Next 30 Days)</SubSectionTitle>
            <InsightList items={data.actions.slice(0, 2)} />
            <SubSectionTitle>Process Improvements</SubSectionTitle>
            <InsightList
              items={[
                'Align cutting schedules to top diameter demand.',
                'Introduce weekly offcut review with production leadership.'
              ]}
            />
            <SubSectionTitle>Data Gaps Identified</SubSectionTitle>
            <InsightList
              items={[
                'Production tonnage per site and order.',
                'Operation type, shift, and machine attribution.'
              ]}
            />
            <SubSectionTitle>Management Decisions Required</SubSectionTitle>
            <InsightList
              items={[
                'Approve data capture enhancements in the shop floor system.',
                'Confirm offcut cost assumptions for financial reporting.'
              ]}
            />
          </View>
        </View>
        <Footer />
      </Page>

      {meta.includeAppendix && (
        <Page size="A4" style={styles.page} wrap>
          <Header meta={meta} />
          <View style={styles.section}>
            <SectionTitle>Appendix</SectionTitle>
            <Text style={styles.bodyText}>
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
