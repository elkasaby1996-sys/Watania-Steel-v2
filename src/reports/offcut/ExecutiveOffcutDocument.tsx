import { createContext, useContext, type ReactNode } from 'react';
import { createReportLocale, type ReportLanguage } from './reportLocale';
import type { ExecutiveOffcutReportData } from './buildExecutiveOffcutReportData';

const ReportLocaleContext = createContext(createReportLocale());
const useReportLocale = () => useContext(ReportLocaleContext);

export const DAILY_ROWS_PER_PAGE = 20;
const percent = (numerator: number, denominator: number | null) => denominator && denominator > 0 ? numerator / denominator * 100 : null;
const chunks = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

function ReportPage({ report, number, total, section, children }: { report: ExecutiveOffcutReportData; number: number; total: number; section: string; children: ReactNode }) {
  const { t, date: reportDate } = useReportLocale();
  return <article className={`offcut-report-page ${number === 2 || number === 3 ? "report-analysis-page" : ""} ${number === 2 ? "report-material-page" : ""}`} aria-label={t("Page {page}: {section}", {page:number,section})}>
    <header className="report-masthead">
      <div><strong>{t("Watania Steel")}</strong></div>
      <div className="report-masthead-right"><span>{t("Management report")}</span><strong>{t("Offcut material usage")}</strong></div>
    </header>
    {children}
    <footer className="report-footer"><span>{t("Watania Steel · Internal management use")}</span><span>{reportDate(report.startDate)} - {reportDate(report.endDate)}</span><strong dir="ltr">{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</strong></footer>
  </article>;
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  const { arabic } = useReportLocale();
  return <div className="report-section-heading"><p className="report-kicker">{arabic && number === "A" ? "أ" : number} / {title}</p>{subtitle && <h2>{subtitle}</h2>}</div>;
}

function UsageChart({ series }: { series: { date: string; tons: number }[] }) {
  const { t, number: reportNumber, date: reportDate, month: reportMonth } = useReportLocale();
  // Dense ranges are grouped by month (then year), keeping every ton in the chart.
  const groups = new Map<string, number>();
  const mode = series.length <= 40 ? 'day' : new Set(series.map(row => row.date.slice(0, 7))).size <= 24 ? 'month' : 'year';
  series.forEach(row => { const key = row.date.slice(0, mode === 'day' ? 10 : mode === 'month' ? 7 : 4); groups.set(key, (groups.get(key) || 0) + row.tons); });
  const values = [...groups].map(([date, tons]) => ({ date, tons }));
  if (!values.length) return <p className="report-empty">{t("No usage entries were recorded in the selected period.")}</p>;
  const max = Math.max(...values.map(row => row.tons), 1);
  const width = 610, left = 42, top = 16, height = 145, plotWidth = width - left - 12;
  const slot = plotWidth / values.length;
  const label = (date: string) => mode === 'year' ? date : mode === 'month' ? reportMonth(date) : reportDate(date, true);
  const step = Math.max(1, Math.ceil(values.length / 7));
  return <figure className="report-chart">
    <svg viewBox={`0 0 ${width} 198`} direction="ltr" role="img" aria-label={t("Offcut tonnage by {period}. {count} recorded periods.", {period:t(mode === "day" ? "daily" : mode === "month" ? "monthly" : "annual"),count:values.length})}>
      {[0, 1, 2, 3].map(i => { const y = top + height - height * i / 3; return <g key={i}><line x1={left} x2={width - 8} y1={y} y2={y} stroke="#dce1d9" /><text x={left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="#637067">{reportNumber(max * i / 3, 1)}</text></g>; })}
      {values.map((row, index) => { const h = Math.max(0, row.tons / max * height); const x = left + slot * index + slot / 2; return <g key={row.date}><rect x={x - Math.min(slot * .65, 36) / 2} y={top + height - h} width={Math.min(slot * .65, 36)} height={h} rx="1" fill={row.tons === max ? '#a54e32' : '#456355'}><title>{`${label(row.date)}: ${reportNumber(row.tons)} ${t("t")}`}</title></rect>{(index % step === 0 || (index === values.length - 1 && index % step > step / 2)) && <text x={x} y={183} textAnchor="middle" fontSize="9" fill="#637067">{label(row.date)}</text>}</g>; })}
    </svg>
    <figcaption>{t("Figure 1. Recorded offcut usage ({period} totals), in metric tons. Only periods with entries are shown.", {period:t(mode === "day" ? "daily" : mode === "month" ? "monthly" : "annual")})}</figcaption>
  </figure>;
}

function DiameterChart({ report }: { report: ExecutiveOffcutReportData }) {
  const { t, number: reportNumber, diameter: diameterLabel, pct } = useReportLocale();
  const rows = [...report.offcutBreakdown.rows].filter(row => row.tons > 0).sort((a, b) => b.tons - a.tons);
  const max = Math.max(...rows.map(row => row.tons), 1);
  return <figure className="report-diameter-chart"><div className="report-chart-legend"><span>{t("Diameter")}</span><span>{t("Offcut tonnage / share of selected usage")}</span></div>
    {rows.length ? rows.map(row => <div className="report-bar-row" key={row.diameter}><span>{diameterLabel(row.diameter)}</span><div className="report-bar-track"><div style={{ width: `${row.tons / max * 100}%` }} /></div><strong>{reportNumber(row.tons)} <small>{t("t")}</small></strong><span>{pct(row.percentOfTotal)}</span></div>) : <p className="report-empty">{t("No diameter quantities are available.")}</p>}
    <figcaption>{t("Ranked by recorded offcut weight. Shares use total offcut tonnage as the denominator.")}</figcaption>
  </figure>;
}

function ReportDocumentBody({ report, includeAppendix = false }: { report: ExecutiveOffcutReportData; includeAppendix?: boolean }) {
  const { t, arabic, language, number: reportNumber, date: reportDate, month: reportMonth, diameter: diameterLabel, pct, preparedBy, issued } = useReportLocale();
  const appendix = includeAppendix ? chunks(report.dailySeries, DAILY_ROWS_PER_PAGE) : [];
  const totalPages = 3 + appendix.length;
  const production = report.kpis.productionTotalTons;
  const tons = report.kpis.offcutTotalTons;
  const ratio = percent(tons, production);
  const activeDays = report.dailySeries.length;
  const average = activeDays ? tons / activeDays : 0;
  const peak = report.dailySeries.reduce<{ date: string; tons: number } | null>((best, row) => !best || row.tons > best.tons ? row : best, null);
  const top = report.highlights.topDiameters[0];
  const topShare = percent(report.highlights.topDiameters.reduce((sum, row) => sum + row.tons, 0), tons);
  const coverage = report.coverage;
  const isOpenPeriod = report.generatedAt ? report.endDate >= report.generatedAt.slice(0, 10) : false;
  const materialRows = report.offcutBreakdown.rows;
  const monthly = report.monthlySeries;
  const monthGroups = monthly.length > 12 ? [...monthly.reduce((map, row) => map.set(row.month.slice(0, 4), (map.get(row.month.slice(0, 4)) || 0) + row.tons), new Map<string, number>())].map(([month, tons]) => ({ month, tons })) : monthly;
  return <div className="offcut-report-document" lang={language} dir={arabic ? "rtl" : "ltr"}>
    <ReportPage report={report} number={1} total={totalPages} section={t("Executive overview")}>
      <div className="report-cover-heading"><p className="report-kicker">{t("01 / Executive overview")}</p><h1>{t("Offcut usage")}<br /><em>{t("Executive report.")}</em></h1></div>
      <dl className="report-meta"><div><dt>{t("Reporting period")}</dt><dd>{reportDate(report.startDate)} - {reportDate(report.endDate)}</dd></div><div><dt>{t("Prepared by")}</dt><dd><bdi>{preparedBy(report.preparedBy)}</bdi></dd></div><div><dt>{t("Issued")}</dt><dd>{issued(report)}</dd></div></dl>
      <section className="report-lead-stat" aria-label={t("Key results")}><div><p className="report-kicker">{t("Offcut material used")}</p><p className="report-big-number">{reportNumber(tons)}<span>{t("metric tons")}</span></p></div><div className="report-ratio"><strong>{pct(ratio)}</strong><span>{t("of recorded cut-and-bend volume")}</span><small>{production == null ? t("Comparison data unavailable") : t("{tons} t recorded volume", {tons:reportNumber(production)})}</small></div></section>
      <dl className="report-stat-strip"><div><dt>{t("Pieces used")}</dt><dd>{reportNumber(report.kpis.totalPieces, 0)}</dd></div><div><dt>{t("Days with entries")}</dt><dd>{activeDays}<small>{t("recorded days")}</small></dd></div><div><dt>{t("Average / recorded day")}</dt><dd>{reportNumber(average)}<small>{t("metric tons")}</small></dd></div></dl>
      <section className="report-summary"><h2>{t("Period in review")}</h2>{arabic ? <p>بلغ استخدام بواقي الحديد <strong><bdi>{reportNumber(tons)}</bdi> طن</strong>، وسُجل النشاط في <strong>{activeDays} من الأيام</strong>{coverage ? <>، بإجمالي <strong>{reportNumber(coverage.entryCount, 0)} من السجلات</strong></> : null}. {top ? <>كانت أكبر كمية مسجلة ضمن فئة <strong>{diameterLabel(top.diameter)}</strong>، وبلغت <strong><bdi>{reportNumber(top.tons)}</bdi> طن</strong>.</> : 'لم تُسجل كميات موجبة موزعة حسب القطر.'} {ratio == null ? 'لا يمكن حساب نسبة مقارنة من سجلات القص والثني المتاحة.' : <>يعادل استخدام البواقي <strong><bdi>{pct(ratio)}</bdi></strong> من كمية القص والثني المسجلة للتواريخ المحددة نفسها.</>}</p> : <p>Operations recorded <strong>{reportNumber(tons)} {t("t")}</strong> of offcut usage across <strong>{activeDays} {activeDays === 1 ? "day" : "days"}</strong>{coverage ? ` and ${reportNumber(coverage.entryCount, 0)} ${coverage.entryCount === 1 ? "entry" : "entries"}` : ''}. {top ? <>{diameterLabel(top.diameter)} contributed the largest recorded quantity, at <strong>{reportNumber(top.tons)} {t("t")}</strong>.</> : 'No positive diameter quantities were recorded.'} {ratio == null ? 'A volume comparison cannot be calculated from the available cut-and-bend records.' : <>Offcut usage was equivalent to <strong>{pct(ratio)}</strong> of the recorded cut-and-bend volume for the same selected dates.</>}</p>}</section>
      <section className="report-findings" aria-label={t("Management observations")}>
        <div><span>01</span><div><h3>{t("Material concentration")}</h3>{arabic ? <p>{top ? <>تستحوذ فئات الأقطار الأعلى استخداماً، وعددها {report.highlights.topDiameters.length}، على <strong><bdi>{pct(topShare)}</bdi></strong> من الإجمالي. يُستخدم هذا التوزيع لتحديد أولويات فرز البواقي والتحقق من توفرها.</> : t('Review entry completeness before drawing conclusions about the diameter mix.')}</p> : <p>{top ? <>The leading {report.highlights.topDiameters.length} diameter categories account for <strong>{pct(topShare)}</strong> of usage. Use the breakdown to prioritize offcut sorting and availability checks.</> : t("Review entry completeness before drawing conclusions about the diameter mix.")}</p>}</div></div>
        <div><span>02</span><div><h3>{t("Daily activity")}</h3>{arabic ? <p>{peak ? <>سُجل أعلى استخدام يومي بتاريخ <strong>{reportDate(peak.date)}</strong>، بكمية <strong><bdi>{reportNumber(peak.tons)}</bdi> طن</strong>. يتوفر الجدول اليومي في الملحق الاختياري.</> : t('No daily usage records are available for the selected period.')}</p> : <p>{peak ? <>The highest recorded day was <strong>{reportDate(peak.date)}</strong>, with <strong>{reportNumber(peak.tons)} {t("t")}</strong> used. The daily schedule is available in the optional appendix.</> : t("No daily usage records are available for the selected period.")}</p>}</div></div>
        <div><span>03</span><div><h3>{t("Year-to-date context")}</h3>{arabic ? <p>{report.kpis.ytdOffcutTons == null || !coverage ? t('Verified year-to-date data is unavailable. Regenerate the report to refresh the source data.') : <>بلغ الاستخدام <strong><bdi>{reportNumber(report.kpis.ytdOffcutTons)}</bdi> طن</strong> من {reportDate(coverage.ytdStartDate)} إلى {reportDate(coverage.ytdEndDate)}. قد يختلف هذا النطاق عن فترة التقرير المحددة.</>}</p> : <p>{report.kpis.ytdOffcutTons == null || !coverage ? t("Verified year-to-date data is unavailable. Regenerate the report to refresh the source data.") : <><strong>{reportNumber(report.kpis.ytdOffcutTons)} {t("t")}</strong> recorded from {reportDate(coverage.ytdStartDate)} through {reportDate(coverage.ytdEndDate)}. This scope may differ from the selected reporting period.</>}</p>}</div></div>
      </section>
      <p className="report-scope-note">{isOpenPeriod ? t("Open reporting period: totals reflect records available when this report was generated. ") : ''}{t("The volume ratio is contextual; it is not a recovery rate, production yield, or verified cost saving.")}</p>
    </ReportPage>

    <ReportPage report={report} number={2} total={totalPages} section={t("Material analysis")}>
      <SectionTitle number="02" title={t("Material analysis")} subtitle={t("Where the material was used.")} />
      <DiameterChart report={report} />
      <section><div className="report-table-heading"><h3>{t("Diameter reconciliation")}</h3><span>{t("All weights in metric tons (t)")}</span></div>
        <div className="report-table-scroll"><table className="report-table"><thead><tr><th scope="col">{t("Diameter")}</th><th scope="col">{t("Offcut used")}<br />{t("(t)")}</th><th scope="col">{t("Share of")}<br />{t("offcut")}</th><th scope="col">{t("Recorded C&B")}<br />{t("(t)")}</th><th scope="col">{t("Offcut / C&B")}<br />{t("same diameter")}</th></tr></thead><tbody>{materialRows.map(row => {
          const matching = report.productionBreakdown.rows.find(item => item.diameter === row.diameter);
          const p = production == null || !matching ? null : matching.tons;
          return <tr key={row.diameter}><th scope="row">{diameterLabel(row.diameter)}</th><td>{reportNumber(row.tons)}</td><td>{pct(row.percentOfTotal)}</td><td>{p == null ? t("N/A") : reportNumber(p)}</td><td>{pct(percent(row.tons, p))}</td></tr>;
        })}</tbody><tfoot><tr><th scope="row">{t("Total")}</th><td>{reportNumber(tons)}</td><td>{tons > 0 ? '100.0%' : t("N/A")}</td><td>{production == null ? t("N/A") : reportNumber(production)}</td><td>{pct(ratio)}</td></tr></tfoot></table></div>
        <p className="report-footnote">{t("C&B = cut-and-bend. Recorded volume is the sum of diameter quantities in active and archived cut-and-bend orders, selected by order date. It is not a separately verified measure of completed factory output. N/A means unavailable or a zero denominator.")}</p>
      </section>
      <section className="report-client-section"><div className="report-table-heading"><h3>{t("Leading client allocations")}</h3><span>{t("Recorded offcut tonnage")}</span></div>
        {report.highlights.topClients.length ? <ol className="report-client-list">{report.highlights.topClients.map((client, index) => <li key={client.name}><span>{String(index + 1).padStart(2, '0')}</span><strong><bdi dir="auto">{client.name}</bdi></strong><span>{reportNumber(client.tons)} {t("t")}</span></li>)}</ol> : <p className="report-empty">{t("Client allocations are not available in the selected offcut records.")}</p>}
        {coverage && coverage.unassignedClientTons > 0 && <p className="report-footnote">{t("A further {tons} t has no client name recorded.", {tons:reportNumber(coverage.unassignedClientTons)})}</p>}
      </section>
    </ReportPage>

    <ReportPage report={report} number={3} total={totalPages} section={t("Activity and reporting basis")}>
      <SectionTitle number="03" title={t("Activity & reporting basis")} subtitle={t("Usage over the reporting period.")} />
      <p className="report-intro">{t("Recorded activity supports operational review; unrecorded dates are not treated as confirmed zero-usage days.")}</p>
      <UsageChart series={report.dailySeries} />
      <section><div className="report-table-heading"><h3>{monthly.length > 12 ? t("Annual summary within selection") : t("Monthly summary within selection")}</h3><span>{isOpenPeriod ? t("Current period is open") : t("Selected dates only")}</span></div>
        <div className="report-monthly-summary">{monthGroups.map(row => <div key={row.month}><span>{row.month.length === 4 ? row.month : reportMonth(row.month)}</span><strong>{reportNumber(row.tons)} <small>{t("t")}</small></strong></div>)}</div>
        <p className="report-footnote">{t("Only dates inside the selected range contribute to these totals. Partial months should not be compared directly with complete months.")}</p>
      </section>
      <section className="report-methodology"><h3>{t("Reporting basis")}</h3><dl>
        <div><dt>{t("Usage source")}</dt><dd>{t("Offcut usage entries, filtered by usage date. Weights use the recorded metric-ton values; pieces are summed separately.")}{coverage ? t(" Entries included: {count}.", {count:reportNumber(coverage.entryCount, 0)}) : ''}</dd></div>
        <div><dt>{t("Volume reference")}</dt><dd>{coverage?.productionStatus === 'unavailable' || production == null ? t("Cut-and-bend records could not be retrieved. Volume and ratio fields are marked N/A.") : coverage?.productionStatus === 'empty' ? t("No cut-and-bend orders were found for the selected dates. A ratio cannot be calculated.") : t("Active and archived cut-and-bend orders, filtered by order date.") + (coverage ? t(" Records included: {count}.", {count:reportNumber(coverage.productionRecordCount, 0)}) : "") + t(" Diameter breakdown totals form the comparison base.")}</dd></div>
        <div><dt>{t("Calculations")}</dt><dd>{t("Offcut share = diameter offcut weight / total offcut weight. Volume ratio = offcut weight / recorded C&B weight. Daily average uses days with entries. Totals use unrounded values; displayed weights are rounded to three decimals.")}</dd></div>
        <div><dt>{t("Interpretation")}</dt><dd>{t("No utilization target, cost saving, or recovery efficiency is assumed. Unknown diameters are grouped as Other / unspecified. This report is a snapshot of recorded activity, not an audited production or financial statement.")}</dd></div>
      </dl></section>
      {(coverage?.invalidWeightCount || !coverage) ? <p className="report-data-note">{coverage ? t("Entries with missing or invalid tonnage: {count}. Their weight is excluded from totals. Review those entries before relying on this report.", {count:coverage.invalidWeightCount}) : t("This report was saved using an earlier data format. Regenerate it for current data coverage and year-to-date validation.")}</p> : null}
      <div className="report-signoff"><div><span>{t("Prepared by")}</span><strong><bdi>{preparedBy(report.preparedBy)}</bdi></strong></div><div><span>{t("Reviewed by")}</span><div className="report-signature-line" /></div><div><span>{t("Review date")}</span><div className="report-signature-line" /></div></div>
    </ReportPage>
    {appendix.map((days, page) => <ReportPage key={page} report={report} number={page + 4} total={totalPages} section={t("Daily usage schedule")}><SectionTitle number="A" title={t("Supporting schedule")} subtitle={t("Daily offcut usage.")} /><p className="report-intro">{t("Recorded dates only. Supporting schedule {page} of {total}.", {page:page+1,total:appendix.length})}</p><table className="report-table report-schedule"><thead><tr><th scope="col">{t("Usage date")}</th><th scope="col">{t("Offcut used (t)")}</th><th scope="col">{t("Share of selected usage")}</th></tr></thead><tbody>{days.map(row => <tr key={row.date}><th scope="row">{reportDate(row.date)}</th><td>{reportNumber(row.tons)}</td><td>{pct(percent(row.tons, tons))}</td></tr>)}</tbody><tfoot><tr><th scope="row">{t("Page subtotal")}</th><td>{reportNumber(days.reduce((sum, row) => sum + row.tons, 0))}</td><td>{pct(percent(days.reduce((sum, row) => sum + row.tons, 0), tons))}</td></tr></tfoot></table><p className="report-footnote">{t("Selected-period total: {tons} t across {days} recorded dates. Page subtotals use unrounded values.", {tons:reportNumber(tons),days:activeDays})}</p></ReportPage>)}
  </div>;
}

export function ExecutiveOffcutDocument({language = "en", ...props}: {report: ExecutiveOffcutReportData; includeAppendix?: boolean; language?: ReportLanguage}) {
  return <ReportLocaleContext.Provider value={createReportLocale(language)}><ReportDocumentBody {...props} /></ReportLocaleContext.Provider>;
}
