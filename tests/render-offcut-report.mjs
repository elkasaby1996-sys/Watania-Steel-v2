import { build } from 'esbuild';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const dir = resolve('node_modules/.cache/offcut-report-qa');
await mkdir(dir, { recursive: true });
const bundle = resolve(dir, 'document.mjs');
await build({ stdin: { contents: "export { ExecutiveOffcutDocument, DAILY_ROWS_PER_PAGE } from './src/reports/offcut/ExecutiveOffcutDocument'; export { buildExecutiveOffcutReportData } from './src/reports/offcut/buildExecutiveOffcutReportData';", resolveDir: process.cwd(), loader: 'tsx' }, outfile: bundle, bundle: true, jsx: 'automatic', packages: 'external', platform: 'node', format: 'esm' });
const { ExecutiveOffcutDocument, DAILY_ROWS_PER_PAGE, buildExecutiveOffcutReportData: make } = await import(pathToFileURL(bundle));
const css = await readFile('src/reports/offcut/offcutExecutivePrint.css', 'utf8');
const language = process.argv[3] === 'ar' ? 'ar' : 'en';
const allDiameters = ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm', 'unknown'];
const usage = (count, start = '2026-09-01') => Array.from({ length: count }, (_, i) => ({ id: String(i), date: new Date(Date.parse(start+'T12:00:00Z') + i * 86400000).toISOString().slice(0,10), bar_diameter: allDiameters[i % 10], company: ['AL WATANIA GENERAL CONTRACTING AND INDUSTRIAL SERVICES', 'QATAR BUILDING MATERIALS AND CONSTRUCTION COMPANY', 'CLIENT ALLOCATION EXAMPLE'][i % 3], weight_tons: (i % 9 + 1) * 1.371, pieces_used: (i+1) * 120 }));
const prod = [{ date:'2026-09-02', order_type:'cut-and-bend', breakdown_8mm: 12, breakdown_10mm: 24, breakdown_12mm: 68, breakdown_14mm: 87, breakdown_16mm: 21, breakdown_18mm: 76, breakdown_20mm: 64, breakdown_25mm: 85, breakdown_32mm: 106 }];
const fixtures = [
  ['monthly', make({startDate:'2026-09-01',endDate:'2026-09-30',now:new Date('2026-09-13T10:30:00Z'),offcutRows:usage(30),productionRows:prod,ytdOffcutRows:usage(30)}), true],
  ['annual', make({startDate:'2026-01-01',endDate:'2026-12-31',now:new Date('2027-01-01T10:30:00Z'),offcutRows:usage(365,'2026-01-01'),productionRows:prod,ytdOffcutRows:usage(365,'2026-01-01')}), false],
  ['missing', make({startDate:'2026-09-01',endDate:'2026-09-30',now:new Date('2026-09-13T10:30:00Z'),offcutRows:[...usage(1), { ...usage(1)[0], id:'invalid',weight_tons:null }]}), false],
];
for(const [name,report,includeAppendix] of fixtures.filter(([name]) => !process.argv[2] || process.argv[2] === name)) {
 const body = renderToStaticMarkup(React.createElement(ExecutiveOffcutDocument, {report,includeAppendix,language}));
 const filename = name + (language === 'ar' ? '-ar' : '');
 const html = resolve(dir, filename+'.html');
 await writeFile(html, `<!doctype html><html lang="${language}"><meta charset="utf-8"><title>Report QA - ${name}</title><style>*{box-sizing:border-box}body{margin:0}button,input{font:inherit}${css}</style><body>${body}</body></html>`);
 const pdf = resolve(dir,filename+'.pdf');
 execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--no-pdf-header-footer',`--user-data-dir=${resolve(dir,'chrome-profile')}`,`--print-to-pdf=${pdf}`,pathToFileURL(html).href], {timeout:60000,stdio:'ignore'});
 const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
 const actual = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
 const expected = 3 + (includeAppendix ? Math.ceil(report.dailySeries.length / DAILY_ROWS_PER_PAGE) : 0);
 if(actual !== expected) throw new Error(`${name}: expected ${expected} pages, rendered ${actual}`);
 console.log(`${filename}: ${actual} A4 pages verified`);
}
await unlink(bundle);
