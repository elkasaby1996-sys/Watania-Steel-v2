import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ReferenceLine,
  ReferenceDot,
  LabelList
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  ExecutiveOffcutReportData
} from './buildExecutiveOffcutReportData';
import './offcutExecutivePrint.css';

const diameterOrder = ['8', '10', '12', '14', '16', '18', '20', '25', '32'];
const EXEC_REPORT_SESSION_KEY = 'offcutExecutiveReport';
const EXEC_REPORT_LOCAL_PREFIX = 'offcutExecutiveReport:';
const EXEC_REPORT_LATEST_KEY = 'offcutExecutiveReportLatest';

const formatNumber = (value: number, fractionDigits = 3) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const formatPercent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(1)}%`;

const formatSigned = (value: number, fractionDigits = 1) =>
  `${value >= 0 ? '+' : ''}${formatNumber(value, fractionDigits)}`;

const formatReadableDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
};

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const parseReportData = (raw: string | null): ExecutiveOffcutReportData | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExecutiveOffcutReportData;
  } catch (error) {
    console.error('Failed to parse report data:', error);
    return null;
  }
};

const getReportData = (): ExecutiveOffcutReportData | null => {
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('rid');

  if (reportId) {
    const byId = parseReportData(localStorage.getItem(`${EXEC_REPORT_LOCAL_PREFIX}${reportId}`));
    if (byId) return byId;
  }

  const latestId = localStorage.getItem(EXEC_REPORT_LATEST_KEY);
  if (latestId) {
    const latest = parseReportData(localStorage.getItem(`${EXEC_REPORT_LOCAL_PREFIX}${latestId}`));
    if (latest) return latest;
  }

  const session = parseReportData(sessionStorage.getItem(EXEC_REPORT_SESSION_KEY));
  if (session) return session;

  return parseReportData(localStorage.getItem(EXEC_REPORT_SESSION_KEY));
};

export const OffcutExecutivePrintPage = () => {
  const report = useMemo(() => getReportData(), []);

  if (!report) {
    return (
      <div className="print-wrapper">
        <div className="print-toolbar">
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
        <div className="print-page">
          <h1 className="print-title">Offcut Usage Report</h1>
          <p className="print-muted">
            Report data is not available. Please return to Offcut Usage and open the
            executive report again.
          </p>
        </div>
      </div>
    );
  }

  const monthToMonth = report.kpis.monthToMonthChange;
  const monthToMonthLabel =
    monthToMonth.currentMonth && monthToMonth.previousMonth
      ? `${formatMonthLabel(monthToMonth.currentMonth)} vs ${formatMonthLabel(
          monthToMonth.previousMonth
        )}`
      : 'Not available';
  const offcutToProductionPct =
    report.kpis.productionTotalTons && report.kpis.productionTotalTons > 0
      ? (report.kpis.offcutTotalTons / report.kpis.productionTotalTons) * 100
      : null;
  const targetOffcutUtilizationPct = 5.0;
  const varianceToTargetPct =
    offcutToProductionPct === null ? null : offcutToProductionPct - targetOffcutUtilizationPct;
  const topDiameterSharePct =
    report.kpis.offcutTotalTons > 0
      ? (report.highlights.topDiameters.reduce((sum, item) => sum + item.tons, 0) /
          report.kpis.offcutTotalTons) *
        100
      : 0;
  const monthGrowthNarrative =
    monthToMonth.deltaTons === null || monthToMonth.deltaPercent === null
      ? 'Month-over-month comparison is not available yet.'
      : `${formatSigned(monthToMonth.deltaTons)} t (${formatSigned(monthToMonth.deltaPercent, 0)}%)`;
  const comparativeRows = diameterOrder.map((diameter) => {
    const productionRow = report.productionBreakdown.rows.find((item) => item.diameter === diameter);
    const offcutRow = report.offcutBreakdown.rows.find((item) => item.diameter === diameter);
    const productionTons = productionRow?.tons ?? 0;
    const offcutTons = offcutRow?.tons ?? 0;
    const ratio = productionTons > 0 ? (offcutTons / productionTons) * 100 : null;
    return { diameter, productionTons, offcutTons, ratio };
  });

  const dailySeriesTotal = report.dailySeries.reduce((sum, row) => sum + row.tons, 0);
  const averageDailyTons =
    report.dailySeries.length > 0 ? dailySeriesTotal / report.dailySeries.length : null;
  const peakDay =
    report.dailySeries.length > 0
      ? report.dailySeries.reduce((max, row) => (row.tons > max.tons ? row : max), report.dailySeries[0])
      : null;
  const lowestDay =
    report.dailySeries.length > 0
      ? report.dailySeries.reduce((min, row) => (row.tons < min.tons ? row : min), report.dailySeries[0])
      : null;

  return (
    <div className="print-wrapper">
      {/* How to use: open this route from Offcut Usage, then click Print / Save PDF. */}
      <div className="print-toolbar no-print">
        <p className="print-hint">For clean PDF output, disable browser Headers and Footers in print settings.</p>
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>

      <div className="print-page">
        <header className="print-header">
          <div className="logo-block">Watania Steel</div>
          <div>
            <h1 className="print-title">Offcut Usage Report</h1>
            <p className="print-muted">
              Period of analysis: From {report.startDate} to {report.endDate}
            </p>
          </div>
          <div className="header-meta">
            <div>
              <span className="meta-label">Prepared by</span>
              <span>{report.preparedBy}</span>
            </div>
            <div>
              <span className="meta-label">Generated on</span>
              <span>{report.generatedOn}</span>
            </div>
          </div>
        </header>

        <section className="section">
          <h2 className="section-title">Executive Summary</h2>
          <div className="executive-summary">
            <p>
              During the period {formatReadableDate(report.startDate)} to {formatReadableDate(report.endDate)},
              the Cut-and-Bend division utilized <strong>{formatNumber(report.kpis.offcutTotalTons)} tons</strong> of
              offcut material, representing <strong>{offcutToProductionPct === null ? 'N/A' : `${offcutToProductionPct.toFixed(1)}%`}</strong>
              {' '}of total production (
              <strong>{report.kpis.productionTotalTons === null ? 'Not available' : `${formatNumber(report.kpis.productionTotalTons)} tons`}</strong>).
            </p>
            <p>
              Compared to the previous month, offcut utilization moved by <strong>{monthToMonth.deltaTons === null ? 'N/A' : `${formatSigned(monthToMonth.deltaTons)} tons`}</strong>
              {monthToMonthLabel !== 'Not available' ? ` (${monthToMonthLabel})` : ''}.
              The highest usage concentration was in{' '}
              <strong>
                {report.highlights.topDiameters.map((item) => `${item.diameter}mm`).join(', ') || 'N/A'}
              </strong>
              , accounting for <strong>{topDiameterSharePct.toFixed(1)}%</strong> of total offcut usage.
            </p>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Executive KPIs</h2>
          <div className="kpi-grid-exec">
            <div className="kpi-card kpi-card-main">
              <span className="kpi-number">
                {report.kpis.productionTotalTons === null ? 'N/A' : `${formatNumber(report.kpis.productionTotalTons, 1)} t`}
              </span>
              <span className="kpi-label">Total Production</span>
            </div>
            <div className="kpi-card kpi-card-main">
              <span className="kpi-number">{formatNumber(report.kpis.offcutTotalTons, 1)} t</span>
              <span className="kpi-label">Offcut Used</span>
            </div>
            <div className="kpi-card kpi-card-main">
              <span className="kpi-number">{offcutToProductionPct === null ? 'N/A' : `${offcutToProductionPct.toFixed(1)}%`}</span>
              <span className="kpi-label">Offcut Ratio</span>
            </div>
            <div className="kpi-card kpi-card-main">
              <span className="kpi-number">{monthToMonth.deltaTons === null ? 'N/A' : `${formatSigned(monthToMonth.deltaTons, 1)} t`}</span>
              <span className="kpi-label">MoM Change</span>
            </div>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">YTD Offcut Used</span>
              <span className="kpi-value">{formatNumber(report.kpis.ytdOffcutTons)} t</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Total Pieces</span>
              <span className="kpi-value">{report.kpis.totalPieces.toLocaleString('en-US')}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Target Offcut Utilization</span>
              <span className="kpi-value">{targetOffcutUtilizationPct.toFixed(1)}%</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Variance to Target</span>
              <span className="kpi-value">{varianceToTargetPct === null ? 'N/A' : `${formatSigned(varianceToTargetPct, 1)}%`}</span>
              <span className="kpi-subtext">{monthToMonthLabel}</span>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Highlights</h2>
          <div className="highlight-grid">
            <div className="highlight-card">
              <h3>Top 3 Offcut Diameters</h3>
              {report.highlights.topDiameters.length === 0 ? (
                <p className="print-muted">Not available in dataset.</p>
              ) : (
                <ul>
                  {report.highlights.topDiameters.map((item) => (
                    <li key={item.diameter}>
                      {item.diameter}mm - {formatNumber(item.tons)} t
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="highlight-card">
              <h3>Top 3 Clients</h3>
              {!report.highlights.clientsAvailable || report.highlights.topClients.length === 0 ? (
                <p className="print-muted">Not available in dataset.</p>
              ) : (
                <ul>
                  {report.highlights.topClients.map((item) => (
                    <li key={item.name}>
                      {item.name} - {formatNumber(item.tons)} t
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="print-page">
        <section className="section">
          <h2 className="section-title">Production Breakdown by Diameter</h2>
          {!report.productionBreakdown.available ? (
            <p className="print-muted">Production data not available for selected period.</p>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Diameter (mm)</th>
                  <th className="text-right">Production Tons</th>
                  <th className="text-right">% of Production</th>
                </tr>
              </thead>
              <tbody>
                {diameterOrder.map((diameter) => {
                  const row = report.productionBreakdown.rows.find(
                    (item) => item.diameter === diameter
                  );
                  return (
                    <tr key={diameter}>
                      <td>{diameter}</td>
                      <td className="text-right">
                        {row ? formatNumber(row.tons) : '0.000'}
                      </td>
                      <td className="text-right">{formatPercent(row?.percentOfTotal ?? 0)}</td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td>Total</td>
                  <td className="text-right">
                    {formatNumber(report.productionBreakdown.totalTons)}
                  </td>
                  <td className="text-right">100.0%</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Diameter Efficiency Comparison</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Diameter (mm)</th>
                <th className="text-right">Production (t)</th>
                <th className="text-right">Offcut Used (t)</th>
                <th className="text-right">Offcut % of Diameter</th>
              </tr>
            </thead>
            <tbody>
              {comparativeRows.map((row) => (
                <tr key={`cmp-${row.diameter}`}>
                  <td>{row.diameter}</td>
                  <td className="text-right">{formatNumber(row.productionTons)}</td>
                  <td className="text-right">{formatNumber(row.offcutTons)}</td>
                  <td className="text-right">{formatPercent(row.ratio)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td className="text-right">{formatNumber(report.productionBreakdown.totalTons)}</td>
                <td className="text-right">{formatNumber(report.offcutBreakdown.totalTons)}</td>
                <td className="text-right">{offcutToProductionPct === null ? 'N/A' : `${offcutToProductionPct.toFixed(1)}%`}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <h2 className="section-title">Offcut Diameter Usage Breakdown</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Diameter (mm)</th>
                <th className="text-right">Offcut Tons Used</th>
                <th className="text-right">% of Total Offcut</th>
                <th className="text-right">% of Total Cut-and-Bend Production</th>
              </tr>
            </thead>
            <tbody>
              {diameterOrder.map((diameter) => {
                const row = report.offcutBreakdown.rows.find(
                  (item) => item.diameter === diameter
                );
                return (
                  <tr key={diameter}>
                    <td>{diameter}</td>
                    <td className="text-right">
                      {row ? formatNumber(row.tons) : '0.000'}
                    </td>
                    <td className="text-right">
                      {formatPercent(row?.percentOfTotal ?? 0)}
                    </td>
                    <td className="text-right">
                      {formatPercent(row?.percentOfProduction ?? null)}
                    </td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td>Total</td>
                <td className="text-right">
                  {formatNumber(report.offcutBreakdown.totalTons)}
                </td>
                <td className="text-right">100.0%</td>
                <td className="text-right">
                  {formatPercent(
                    report.kpis.productionTotalTons
                      ? (report.offcutBreakdown.totalTons / report.kpis.productionTotalTons) *
                          100
                      : null
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="print-page">
        <section className="section">
          <h2 className="section-title">Daily Offcut Usage (tons)</h2>
          <p className="print-muted">
            {averageDailyTons === null
              ? 'Daily trend analysis is not available for this period.'
              : `Average daily usage: ${formatNumber(averageDailyTons, 2)} t. Peak day: ${peakDay ? `${formatDateLabel(peakDay.date)} (${formatNumber(peakDay.tons, 2)} t)` : 'N/A'}. Lowest day: ${lowestDay ? `${formatDateLabel(lowestDay.date)} (${formatNumber(lowestDay.tons, 2)} t)` : 'N/A'}.`}
          </p>
          <div className="chart-card">
            {report.dailySeries.length === 0 ? (
              <p className="print-muted">No daily offcut data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={report.dailySeries}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    label={{ value: 'Date', position: 'insideBottomRight', offset: -8 }}
                  />
                  <YAxis
                    label={{ value: 'Tons (t)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  {averageDailyTons !== null && (
                    <ReferenceLine
                      y={averageDailyTons}
                      stroke="#64748b"
                      strokeDasharray="6 4"
                      label={{ value: 'Average', position: 'insideTopRight', fill: '#334155' }}
                    />
                  )}
                  {peakDay && (
                    <ReferenceDot
                      x={peakDay.date}
                      y={peakDay.tons}
                      r={5}
                      fill="#dc2626"
                      stroke="#ffffff"
                      label={{ value: 'Peak', position: 'top', fill: '#991b1b' }}
                    />
                  )}
                  {lowestDay && (
                    <ReferenceDot
                      x={lowestDay.date}
                      y={lowestDay.tons}
                      r={5}
                      fill="#0284c7"
                      stroke="#ffffff"
                      label={{ value: 'Low', position: 'bottom', fill: '#075985' }}
                    />
                  )}
                  <Line type="monotone" dataKey="tons" stroke="#1d4ed8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Monthly Offcut Usage (tons)</h2>
          <p className="growth-badge">
            Month-over-month movement: <strong>{monthGrowthNarrative}</strong>
          </p>
          <div className="chart-card">
            {report.monthlySeries.length === 0 ? (
              <p className="print-muted">No monthly offcut data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.monthlySeries}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthLabel}
                    label={{ value: 'Month', position: 'insideBottomRight', offset: -8 }}
                  />
                  <YAxis
                    label={{ value: 'Tons (t)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Bar dataKey="tons" fill="#0f766e">
                    <LabelList dataKey="tons" position="top" formatter={(value: number) => formatNumber(value, 1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
