import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';
import type { ExecutiveOffcutReportData } from './buildExecutiveOffcutReportData';
import { ExecutiveOffcutDocument, DAILY_ROWS_PER_PAGE } from './ExecutiveOffcutDocument';
import { createReportLocale, type ReportLanguage } from './reportLocale';
import './offcutExecutivePrint.css';

const parseReportData = (raw: string | null): ExecutiveOffcutReportData | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ExecutiveOffcutReportData;
    const validRows = (rows: unknown, key: string) => Array.isArray(rows) && rows.every(row => row && typeof row[key] === 'string' && Number.isFinite(row.tons));
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(value.endDate) ||
      !value.kpis || !Number.isFinite(value.kpis.offcutTotalTons) || !Number.isFinite(value.kpis.totalPieces) ||
      !validRows(value.dailySeries, 'date') || !validRows(value.monthlySeries, 'month') ||
      !validRows(value.offcutBreakdown?.rows, 'diameter') || !validRows(value.productionBreakdown?.rows, 'diameter') ||
      !validRows(value.highlights?.topDiameters, 'diameter') || !validRows(value.highlights?.topClients, 'name')) return null;
    return value;
  } catch { return null; }
};

function getReportData() {
  try {
    const reportId = new URLSearchParams(window.location.search).get('rid');
    // A specific report link must never silently display a different saved report.
    if (reportId) return parseReportData(localStorage.getItem(`offcutExecutiveReport:${reportId}`));
    const latestId = localStorage.getItem('offcutExecutiveReportLatest');
    return (latestId && parseReportData(localStorage.getItem(`offcutExecutiveReport:${latestId}`))) ||
      parseReportData(sessionStorage.getItem('offcutExecutiveReport')) ||
      parseReportData(localStorage.getItem('offcutExecutiveReport'));
  } catch { return null; }
}

export function OffcutExecutivePrintPage() {
  const report = useMemo(getReportData, []);
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [language, setLanguage] = useState<ReportLanguage>(() => {
    try { return localStorage.getItem('offcutReportLanguage') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  });
  const {t, arabic, date: reportDate} = createReportLocale(language);
  const changeLanguage = (value: ReportLanguage) => {
    setLanguage(value);
    try { localStorage.setItem('offcutReportLanguage', value); } catch { /* Preference persistence is optional. */ }
  };
  const pages = 3 + (includeAppendix && report ? Math.ceil(report.dailySeries.length / DAILY_ROWS_PER_PAGE) : 0);
  useEffect(() => {
    const previous = document.title;
    if (report) document.title = `${t("Watania Steel")} - ${t("Executive report")} - ${report.startDate} - ${report.endDate}`;
    return () => { document.title = previous; };
  }, [report, language]);
  const printReport = async () => {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } finally { setPrinting(false); }
  };
  return <div className="offcut-report-viewer" lang={language} dir={arabic ? 'rtl' : 'ltr'}>
    <div className="report-toolbar no-print">
      <div className="report-toolbar-main">
        <Link className="report-back-link" to={ROUTES.offcutUsage}><ArrowLeft size={16} />{t('Back to offcut usage')}</Link>
        <div className="report-toolbar-actions">
          <label className="report-language-control"><span>Language / اللغة</span>
            <select aria-label="Report language / لغة التقرير" value={language} onChange={event => changeLanguage(event.target.value as ReportLanguage)}>
              <option value="en" lang="en">English</option><option value="ar" lang="ar">العربية</option>
            </select>
          </label>
          {report && <button className="report-print-button" onClick={printReport} disabled={printing}><Printer size={16} />{printing ? t('Preparing print…') : t('Print / Save PDF')}</button>}
        </div>
      </div>
      {report && <><div className="report-toolbar-details"><div><strong>{t('Executive report')}</strong><span>{reportDate(report.startDate)} - {reportDate(report.endDate)} · {t('A4 portrait · {pages} pages', {pages})}</span></div><label><input type="checkbox" checked={includeAppendix} onChange={event => setIncludeAppendix(event.target.checked)} />{t('Include daily appendix')}</label></div><p className="report-print-help">{t('For PDF, choose Save as PDF in the print dialog. Use A4, 100% scale, and turn off browser headers and footers.')}</p></>}
    </div>
    {report ? <ExecutiveOffcutDocument report={report} includeAppendix={includeAppendix} language={language} /> : <section className="report-unavailable"><FileText size={32} /><h1>{t('Report unavailable')}</h1><p>{t('This saved report is missing or could not be read. Return to Offcut Usage and generate a fresh report for your selected dates.')}</p><Link to={ROUTES.offcutUsage}>{t('Return to offcut usage')}</Link></section>}
  </div>;
}
