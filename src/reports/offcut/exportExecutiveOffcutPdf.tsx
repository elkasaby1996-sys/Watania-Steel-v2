import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import React from 'react';
import { ExecutiveOffcutReport } from './ExecutiveOffcutReport';
import { ExecutiveOffcutReportData, ExecutiveReportMeta } from './buildExecutiveOffcutReportData';

export const exportExecutiveOffcutPdf = async (
  reportData: ExecutiveOffcutReportData,
  meta: ExecutiveReportMeta
) => {
  const document = <ExecutiveOffcutReport data={reportData} meta={meta} />;
  const blob = await pdf(document).toBlob();
  const filename = `Offcut_Executive_Report_${meta.dateRange.start}_to_${meta.dateRange.end}.pdf`;
  saveAs(blob, filename);
};
