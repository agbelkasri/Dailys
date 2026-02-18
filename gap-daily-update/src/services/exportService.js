import * as XLSX from 'xlsx';
import { SECTIONS, SECTION_TYPES } from '../constants/sections';

function formatSubTableForExcel(sectionType, subTableData) {
  if (!subTableData?.length) return '';
  switch (sectionType) {
    case SECTION_TYPES.CUSTOMER_INVENTORY:
      return subTableData
        .map((r) => `${r.customer} | ${r.programNumber} | ${r.partsSupplied} | ${r.coverageNotes}`)
        .join('\n');
    case SECTION_TYPES.DOWNTIME:
      return subTableData.map((r) => `${r.reason}: ${r.percentage}`).join('\n');
    case SECTION_TYPES.QUALITY:
      return subTableData
        .map((r) => `${r.workcenterCode} | ${r.partNumber} | ${r.statusNotes}`)
        .join('\n');
    default:
      return '';
  }
}

export function exportToExcel(sectionsData, date) {
  const wsData = [
    ['GAP Daily Update', '', '', ''],
    [`Report Date: ${date}`, '', '', ''],
    [''],
    ['Responsible Party', 'Measurable', 'Status G/Y/R', 'Comments / Explanation'],
  ];

  for (const sectionDef of SECTIONS) {
    const data = sectionsData[sectionDef.id] || {};
    const content =
      sectionDef.sectionType === SECTION_TYPES.NORMAL
        ? data.comments || ''
        : formatSubTableForExcel(sectionDef.sectionType, data.subTableData);

    wsData.push([sectionDef.responsible, sectionDef.measurable, data.status || '', content]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Responsible
    { wch: 30 }, // Measurable
    { wch: 12 }, // Status
    { wch: 60 }, // Comments
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Daily Update ${date}`);
  XLSX.writeFile(wb, `GAP-Daily-Update-${date}.xlsx`);
}

export function printReport() {
  window.print();
}
