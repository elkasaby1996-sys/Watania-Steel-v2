import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const dir = resolve('node_modules/.cache/offcut-report-qa');
await mkdir(dir, { recursive: true });
const modulePath = resolve(dir, `report-tests-${process.pid}.mjs`);
await build({ stdin: { contents: "export { buildExecutiveOffcutReportData } from './src/reports/offcut/buildExecutiveOffcutReportData'; export { ExecutiveOffcutDocument } from './src/reports/offcut/ExecutiveOffcutDocument'; export { createReportLocale, arabicReportText } from './src/reports/offcut/reportLocale';", resolveDir: process.cwd(), loader: 'tsx' }, outfile: modulePath, bundle: true, jsx: 'automatic', packages: 'external', platform: 'node', format: 'esm' });
const { buildExecutiveOffcutReportData: make, ExecutiveOffcutDocument, createReportLocale, arabicReportText } = await import(pathToFileURL(modulePath));
await unlink(modulePath);
const row = (date, weight, diameter = '12mm', company = 'Client A') => ({ id: `${date}-${diameter}`, date, weight_tons: weight, pieces_used: 10, bar_diameter: diameter, company });
const input = (overrides = {}) => ({ startDate: '2026-09-01', endDate: '2026-09-30', now: new Date('2026-10-01T12:00:00Z'), offcutRows: [], ...overrides });

test('Arabic report preserves source values and mixed-script client names across all pages', () => {
  const report = make(input({ offcutRows: [row('2026-09-01', 84.431, '12mm', 'شركة قطر / Qatar LLC')] }));
  const original = JSON.stringify(report);
  const render = language => renderToStaticMarkup(React.createElement(ExecutiveOffcutDocument, { report, language, includeAppendix: true }));
  const english = render('en'), arabic = render('ar');
  assert.match(english, /lang="en" dir="ltr"/);
  assert.match(arabic, /lang="ar" dir="rtl"/);
  for (const output of [english, arabic]) {
    assert.match(output, /84\.431/);
    assert.match(output, /شركة قطر \/ Qatar LLC/);
    assert.equal((output.match(/<article /g) || []).length, 4);
  }
  for (const label of ['Executive report.', 'Material analysis', 'Reporting basis', 'Daily usage schedule', 'Not available']) assert.ok(arabic.includes(arabicReportText[label]), label);
  assert.doesNotMatch(arabic, /Executive overview|Reporting basis|No usage entries|Not available/);
  assert.equal(JSON.stringify(report), original);
});

test('Arabic locale uses Gregorian dates, stable Latin digits and translated fallbacks', () => {
  const ar = createReportLocale('ar'), en = createReportLocale('en');
  assert.equal(ar.number(1234.567), en.number(1234.567));
  assert.match(ar.date('2026-09-13'), /2026/);
  assert.match(ar.month('2026-09'), /سبتمبر/);
  assert.equal(ar.number(null), 'غير متاح');
  assert.equal(ar.diameter('Other'), 'أخرى / غير محددة');
  assert.equal(ar.preparedBy('Cut-and-Bend Division'), 'قسم القص والثني');
  assert.equal(ar.preparedBy('Ahmed / أحمد'), 'Ahmed / أحمد');
  for (const [key, value] of Object.entries(arabicReportText)) {
    assert.deepEqual([...value.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(), [...key.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(), key);
  }
});

test('diameter, daily and monthly totals reconcile, including unknown diameters and numeric strings', () => {
  const report = make(input({ offcutRows: [row('2026-09-01', 12), row('2026-09-02', '3.5', '99mm'), row('2026-09-02', 2, 'Ø16 mm'), row('2026-08-01', 200)] }));
  assert.equal(report.kpis.offcutTotalTons, 17.5);
  for (const series of [report.dailySeries, report.monthlySeries, report.offcutBreakdown.rows]) assert.equal(series.reduce((s, r) => s + r.tons, 0), 17.5);
  assert.equal(report.offcutBreakdown.rows.find(r => r.diameter === 'Other').tons, 3.5);
  assert.equal(report.offcutBreakdown.rows.find(r => r.diameter === '16').tons, 2);
  assert.equal(report.coverage.entryCount, 3);
});
test('unavailable production and YTD remain unavailable instead of substituting period totals', () => {
  const report = make(input({ offcutRows: [row('2026-09-01', 3)] }));
  assert.equal(report.kpis.productionTotalTons, null);
  assert.equal(report.kpis.ytdOffcutTons, null);
  assert.equal(report.coverage.productionStatus, 'unavailable');
});
test('successful empty fetch is distinct from unavailable data', () => {
  const report = make(input({ productionRows: [], ytdOffcutRows: [] }));
  assert.equal(report.kpis.productionTotalTons, 0);
  assert.equal(report.kpis.ytdOffcutTons, 0);
  assert.equal(report.coverage.productionStatus, 'empty');
  assert.ok(report.offcutBreakdown.rows.every(r => r.percentOfTotal === null));
});
test('YTD uses only the ending calendar year, including for cross-year selections', () => {
  const report = make(input({ startDate: '2025-12-01', endDate: '2026-02-15', ytdOffcutRows: [row('2025-12-02', 100), row('2026-01-02', 4), row('2026-02-15', 7), row('2026-02-20', 80)] }));
  assert.equal(report.kpis.ytdOffcutTons, 11);
});
test('production denominator matches diameter rows and selected cut-and-bend orders', () => {
  const report = make(input({ offcutRows: [row('2026-09-02', 3)], productionRows: [{ date: '2026-09-01', order_type: 'cut-and-bend', breakdown_12mm: 20, breakdown_16mm: 10 }, { date: '2026-09-01', order_type: 'straight-bar', breakdown_12mm: 100 }, { date: '2026-08-01', breakdown_12mm: 50 }] }));
  assert.equal(report.kpis.productionTotalTons, 30);
  assert.equal(report.offcutBreakdown.rows.find(r => r.diameter === '12').percentOfProduction, 10);
});
test('partial or nonadjacent months are not described as a month-on-month comparison', () => {
  const partial = make(input({ startDate: '2026-08-15', offcutRows: [row('2026-08-20', 4), row('2026-09-02', 8)] }));
  assert.equal(partial.kpis.monthToMonthChange.deltaTons, null);
  const gap = make(input({ startDate: '2026-07-01', offcutRows: [row('2026-07-20', 4), row('2026-09-02', 8)] }));
  assert.equal(gap.kpis.monthToMonthChange.deltaTons, null);
  const complete = make(input({ startDate: '2026-08-01', offcutRows: [row('2026-08-20', 4), row('2026-09-02', 8)] }));
  assert.equal(complete.kpis.monthToMonthChange.deltaTons, 4);
});
test('missing weights are disclosed and missing client names remain measurable', () => {
  const report = make(input({ offcutRows: [row('2026-09-02', 3, '12mm', ''), row('2026-09-03', null)] }));
  assert.equal(report.coverage.invalidWeightCount, 1);
  assert.equal(report.coverage.unassignedClientTons, 3);
  assert.equal(report.kpis.offcutTotalTons, 3);
});
