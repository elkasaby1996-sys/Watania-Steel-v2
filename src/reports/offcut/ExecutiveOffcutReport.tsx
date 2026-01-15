import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Polyline,
  Line,
  Rect
} from '@react-pdf/renderer';
import { ExecutiveOffcutReportData, ExecutiveReportMeta } from './buildExecutiveOffcutReportData';

interface ExecutiveOffcutReportProps {
  data: ExecutiveOffcutReportData;
  meta: ExecutiveReportMeta;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4
  },
  subheader: {
    fontSize: 10,
    color: '#475569'
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  kpiCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    width: '31%'
  },
  kpiLabel: {
    color: '#64748b',
    fontSize: 9,
    marginBottom: 4
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 700
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 12
  },
  chartContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    flex: 1
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 6
  },
  insightsList: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    flex: 1
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4
  },
  bulletDot: {
    width: 10
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: '#1f2937'
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  tableCell: {
    flex: 1,
    fontSize: 9
  },
  tableCellRight: {
    flex: 0.4,
    textAlign: 'right',
    fontSize: 9
  },
  tableCellShare: {
    flex: 0.3,
    textAlign: 'right',
    fontSize: 9
  },
  footerNote: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 6
  }
});

const formatValue = (value: number, decimals = 2) => value.toFixed(decimals);

const renderLineChart = (series: { date: string; tons: number }[]) => {
  const width = 240;
  const height = 80;
  if (!series.length) {
    return (
      <View
        style={{
          width,
          height,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Text style={{ fontSize: 9, color: '#94a3b8' }}>No trend data available.</Text>
      </View>
    );
  }

  const max = Math.max(...series.map((item) => item.tons), 0);
  const min = Math.min(...series.map((item) => item.tons), 0);
  const range = max - min || 1;

  const points = series
    .map((item, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((item.tons - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill="#ffffff" stroke="#e2e8f0" />
      <Polyline points={points} fill="none" stroke="#2563eb" strokeWidth={2} />
    </Svg>
  );
};

const renderBarChart = (items: { label: string; tons: number }[]) => {
  const width = 240;
  const height = 110;
  const bars = items.slice(0, 6);
  if (!bars.length) {
    return (
      <View
        style={{
          width,
          height,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Text style={{ fontSize: 9, color: '#94a3b8' }}>
          No diameter data available.
        </Text>
      </View>
    );
  }

  const max = Math.max(...bars.map((item) => item.tons), 0);
  const barWidth = width / bars.length;

  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill="#ffffff" stroke="#e2e8f0" />
      {bars.map((item, index) => {
        const barHeight = max > 0 ? (item.tons / max) * (height - 20) : 0;
        const x = index * barWidth + 8;
        const y = height - barHeight - 10;
        return (
          <React.Fragment key={item.label}>
            <Rect
              x={x}
              y={y}
              width={barWidth - 12}
              height={barHeight}
              fill="#22c55e"
            />
            <Line
              x1={x}
              y1={height - 10}
              x2={x + barWidth - 12}
              y2={height - 10}
              stroke="#cbd5f5"
              strokeWidth={1}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export const ExecutiveOffcutReport = ({ data, meta }: ExecutiveOffcutReportProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Offcut Usage — Executive Report</Text>
          <Text style={styles.subheader}>
            Date Range: {meta.dateRange.start} to {meta.dateRange.end}
          </Text>
          <Text style={styles.subheader}>Generated: {meta.generatedAt}</Text>
        </View>

        <View style={[styles.section, styles.kpiGrid]}>
          {[
            { label: 'Total Tons', value: formatValue(data.totalTons, 3) },
            { label: 'Total Pieces', value: data.totalPieces.toLocaleString() },
            { label: 'Entries', value: data.entryCount.toLocaleString() },
            { label: 'Avg Tons / Entry', value: formatValue(data.averageTonsPerEntry, 3) },
            { label: 'Unique Clients', value: data.uniqueClients.toLocaleString() },
            { label: 'Exceptions', value: data.exceptionsCount.toLocaleString() }
          ].map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{item.label}</Text>
              <Text style={styles.kpiValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.layoutRow]}>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Usage Trend (Tons)</Text>
            {renderLineChart(data.trendSeries)}
            <Text style={styles.footerNote}>Daily totals (same filter window).</Text>
          </View>
          <View style={styles.insightsList}>
            <Text style={styles.sectionTitle}>Insights & Actions</Text>
            {[...data.insights, ...data.actions].slice(0, 6).map((item) => (
              <View key={item} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tons by Diameter</Text>
          <View style={styles.chartContainer}>{renderBarChart(data.diameterBreakdown)}</View>
        </View>

        <View style={[styles.section, styles.layoutRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Top Clients</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Client</Text>
                <Text style={styles.tableCellRight}>Tons</Text>
                <Text style={styles.tableCellShare}>Share</Text>
              </View>
              {data.topClients.slice(0, 10).map((client) => (
                <View key={client.name} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{client.name}</Text>
                  <Text style={styles.tableCellRight}>{formatValue(client.tons, 3)}</Text>
                  <Text style={styles.tableCellShare}>
                    {formatValue(client.share, 1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Top Sites</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Site</Text>
                <Text style={styles.tableCellRight}>Tons</Text>
                <Text style={styles.tableCellShare}>Share</Text>
              </View>
              {data.topSites.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>No site data available</Text>
                  <Text style={styles.tableCellRight}>-</Text>
                  <Text style={styles.tableCellShare}>-</Text>
                </View>
              )}
              {data.topSites.slice(0, 10).map((site) => (
                <View key={site.name} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{site.name}</Text>
                  <Text style={styles.tableCellRight}>{formatValue(site.tons, 3)}</Text>
                  <Text style={styles.tableCellShare}>{formatValue(site.share, 1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
