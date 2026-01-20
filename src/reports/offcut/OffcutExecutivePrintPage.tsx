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
  Bar
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  ExecutiveOffcutReportData
} from './buildExecutiveOffcutReportData';
import './offcutExecutivePrint.css';

const diameterOrder = ['8', '10', '12', '14', '16', '18', '20', '25', '32'];

const formatNumber = (value: number, fractionDigits = 3) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const formatPercent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(1)}%`;

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

const getReportData = (): ExecutiveOffcutReportData | null => {
  const raw = sessionStorage.getItem('offcutExecutiveReport');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExecutiveOffcutReportData;
  } catch (error) {
    console.error('Failed to parse report data:', error);
    return null;
  }
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

  return (
    <div className="print-wrapper">
      {/* How to use: open this route from Offcut Usage, then click Print / Save PDF. */}
      <div className="print-toolbar no-print">
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
          <h2 className="section-title">Executive KPIs</h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Cut-and-Bend Production (t)</span>
              <span className="kpi-value">
                {report.kpis.productionTotalTons === null
                  ? 'Not available'
                  : formatNumber(report.kpis.productionTotalTons)}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Total Offcut Tons Used (t)</span>
              <span className="kpi-value">
                {formatNumber(report.kpis.offcutTotalTons)}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Total Pieces Used</span>
              <span className="kpi-value">
                {report.kpis.totalPieces.toLocaleString('en-US')}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">YTD Total Offcut Tons Used (t)</span>
              <span className="kpi-value">
                {formatNumber(report.kpis.ytdOffcutTons)}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Month-to-month change (t)</span>
              <span className="kpi-value">
                {monthToMonth.deltaTons === null
                  ? 'Not available'
                  : `${formatNumber(monthToMonth.deltaTons)} t`}
              </span>
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
                      {item.diameter}mm — {formatNumber(item.tons)} t
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
                      {item.name} — {formatNumber(item.tons)} t
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
                  <Line type="monotone" dataKey="tons" stroke="#1d4ed8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Monthly Offcut Usage (tons)</h2>
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
                  <Bar dataKey="tons" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
