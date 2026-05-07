/**
 * Smoke test for the weekly backup pipeline.
 * Generates one .xlsx for GAP using mock section data, no Firebase required.
 *
 * Run:  node scripts/testBackup.js
 * Output:  /tmp/test-backup/GAP Daily Report Wk <today>.xlsx
 */

import ExcelJS from 'exceljs';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getSectionsForPlant, SECTION_TYPES } from '../src/constants/sections.js';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, 'templates');
const OUT_DIR      = join(__dirname, '..', '..', '.claude', 'tmp', 'test-backup');

// Inline copy of the layout from weeklyBackup.js
const LAYOUT = {
  'ehs':                       { row: 8 },
  'staffing-issues':           { row: 11 },
  'current-year-program-eop':  { row: 27 },
  'prem-freight':              { row: 29 },
  'on-time-delivery':          { row: 32 },
  'customer-invty-status':     { row: 35, subTableType: 'CUSTOMER_INVENTORY', subTableRow: 37, maxSubTableRows: 20 },
  'service':                   { row: 57 },
  'supplier-issues':           { row: 60 },
  'labor-overtime':            { row: 63 },
  'daily-efficiency-oee':      { row: 71, subTableType: 'EFFICIENCY', subTableRow: 72, maxSubTableRows: 5 },
  'downtime-analysis':         { row: 77, subTableType: 'DOWNTIME', subTableRow: 79, maxSubTableRows: 5 },
  'operations-update':         { row: 84 },
  'mfg-mishit-reports':        { row: 102 },
  'housekeeping':              { row: 105 },
  'change-overs':              { row: 108 },
  'tooling':                   { row: 113 },
  'maintenance':               { row: 121 },
  'quality-concerns':          { row: 125 },
};

const TITLE_ROW = 3;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayName    = (d) => DAY_NAMES[new Date(d + 'T12:00:00Z').getUTCDay()];
const shortDate  = (d) => { const x = new Date(d + 'T12:00:00Z'); return `${x.getUTCMonth()+1}.${x.getUTCDate()}.${String(x.getUTCFullYear()).slice(-2)}`; };

function stripHtml(str) {
  if (!str) return '';
  return String(str).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

function cloneTemplateSheet(srcWs, destWb, destName) {
  const newWs = destWb.addWorksheet(destName);
  if (srcWs.pageSetup)  Object.assign(newWs.pageSetup, srcWs.pageSetup);
  if (srcWs.views)      newWs.views = JSON.parse(JSON.stringify(srcWs.views));
  if (srcWs.properties) Object.assign(newWs.properties, srcWs.properties);
  for (let c = 1; c <= srcWs.columnCount; c++) {
    const sc = srcWs.getColumn(c);
    const dc = newWs.getColumn(c);
    if (sc.width !== undefined) dc.width = sc.width;
    if (sc.hidden) dc.hidden = sc.hidden;
    if (sc.style)  dc.style = JSON.parse(JSON.stringify(sc.style));
  }
  srcWs.eachRow({ includeEmpty: true }, (row, rNum) => {
    const newRow = newWs.getRow(rNum);
    if (row.height !== undefined) newRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, cNum) => {
      const newCell = newRow.getCell(cNum);
      if (cell.type !== ExcelJS.ValueType.Merge) newCell.value = cell.value;
      if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
    });
  });
  for (const range of (srcWs.model?.merges || [])) {
    try { newWs.mergeCells(range); } catch (_) {}
  }
  if (Array.isArray(srcWs.conditionalFormattings)) {
    const safe = ['expression', 'cellIs', 'containsText', 'notContainsText',
                  'beginsWith', 'endsWith', 'duplicateValues', 'uniqueValues',
                  'top10', 'aboveAverage', 'timePeriod'];
    newWs.conditionalFormattings = JSON.parse(JSON.stringify(srcWs.conditionalFormattings))
      .map(g => ({ ...g, rules: g.rules.filter(r => safe.includes(r.type)) }))
      .filter(g => g.rules.length > 0);
  }
  return newWs;
}

const STATUS_FILLS = {
  G: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008A3E' } },
  Y: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
  R: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } },
};
function setStatus(ws, row, status) {
  if (!status) return;
  const letter = String(status).trim().toUpperCase().charAt(0);
  if (!letter) return;
  const cell = ws.getCell(`D${row}`);
  cell.value = letter;
  if (STATUS_FILLS[letter]) {
    cell.style = { ...(cell.style || {}), fill: STATUS_FILLS[letter] };
    if (letter === 'G' || letter === 'R') {
      cell.style = { ...cell.style, font: { ...(cell.style.font || {}), bold: true, color: { argb: 'FFFFFFFF' } } };
    }
  }
}

function fillCI(ws, sr, rows, max) {
  for (let i = 0; i < Math.min(rows.length, max); i++) {
    const r = sr + i, row = rows[i];
    setStatus(ws, r, row.status);
    if (row.customer)      ws.getCell(`E${r}`).value = row.customer;
    if (row.programNumber) ws.getCell(`F${r}`).value = row.programNumber;
    if (row.partsSupplied) ws.getCell(`G${r}`).value = Number(row.partsSupplied) || row.partsSupplied;
    if (row.coverageNotes) ws.getCell(`H${r}`).value = row.coverageNotes;
  }
}
function fillEff(ws, sr, rows, max) {
  for (let i = 0; i < Math.min(rows.length, max); i++) {
    const r = sr + i, row = rows[i];
    setStatus(ws, r, row.status);
    if (row.workCenter) ws.getCell(`E${r}`).value = row.workCenter;
    if (row.percentage !== undefined) ws.getCell(`F${r}`).value = parseFloat(row.percentage) / 100;
    if (row.notes)      ws.getCell(`G${r}`).value = row.notes;
  }
}
function fillDT(ws, sr, rows, max) {
  for (let i = 0; i < Math.min(rows.length, max); i++) {
    const r = sr + i, row = rows[i];
    if (row.reason)     ws.getCell(`E${r}`).value = row.reason;
    if (row.percentage !== undefined) ws.getCell(`G${r}`).value = parseFloat(row.percentage) / 100;
    if (row.notes)      ws.getCell(`H${r}`).value = row.notes;
  }
}

function fillSection(ws, def, data) {
  const cfg = LAYOUT[def.id];
  if (!cfg) return;
  setStatus(ws, cfg.row, data.status);
  if (def.sectionType === SECTION_TYPES.CUSTOMER_INVENTORY && cfg.subTableRow) {
    fillCI(ws, cfg.subTableRow, data.subTableData || [], cfg.maxSubTableRows);
    return;
  }
  if (def.sectionType === SECTION_TYPES.EFFICIENCY && cfg.subTableRow) {
    fillEff(ws, cfg.subTableRow, data.subTableData || [], cfg.maxSubTableRows);
    return;
  }
  if (def.sectionType === SECTION_TYPES.DOWNTIME && cfg.subTableRow) {
    fillDT(ws, cfg.subTableRow, data.subTableData || [], cfg.maxSubTableRows);
    return;
  }
  if (def.sectionType === SECTION_TYPES.QUALITY) {
    const text = (data.subTableData || []).map(r => `${r.workcenterCode||''} | ${r.partNumber||''} | ${r.statusNotes||''}`).join('\n');
    if (text) ws.getCell(`E${cfg.row}`).value = text;
    return;
  }
  if (data.comments) ws.getCell(`E${cfg.row}`).value = stripHtml(data.comments);
}

const MOCK = {
  'ehs':                  { status: 'G', comments: 'No incidents reported. Safety walk completed.' },
  'staffing-issues':      { status: 'Y', comments: 'DL: Jose Garcia\nIDL: Chrissi Adams left sick at 7:45am.\n\nTotal Present:\nDL = 19 / 22\nIDL = 8 / 10' },
  'current-year-program-eop': { status: 'G', comments: 'GMT610 EOP Dec 2026 - extension under review.' },
  'prem-freight':         { status: 'G', comments: 'No premium freight today.' },
  'on-time-delivery':     { status: 'G', comments: '99.2% OTD week-to-date.' },
  'customer-invty-status': {
    status: 'G',
    subTableData: [
      { status: 'G', customer: 'GM-SH', programNumber: 'C1UL', partsSupplied: '2', coverageNotes: 'Covered until 3/30/26' },
      { status: 'G', customer: 'GM-FZ', programNumber: 'BT1FG', partsSupplied: '2', coverageNotes: 'Covered until 5/11/26' },
      { status: 'Y', customer: 'CIE-AH', programNumber: 'WS', partsSupplied: '1', coverageNotes: 'Tight — covered only until 3/9/26' },
    ],
  },
  'service':              { status: 'R', comments: 'GM-CCA — 13503000 No ship — commercial issues' },
  'supplier-issues':      { status: 'G', comments: 'No issues.' },
  'labor-overtime':       { status: 'Y', comments: 'Direct labor short by 3, ran 9-hour shift to recover.' },
  'daily-efficiency-oee': {
    status: 'G',
    subTableData: [
      { status: 'Y', workCenter: 'Automatics', percentage: '73', notes: 'P115 C199AA - tooling issues' },
      { status: 'G', workCenter: 'Assembly',   percentage: '94', notes: '' },
      { status: 'G', workCenter: 'CNC',        percentage: '90', notes: '' },
      { status: 'G', workCenter: 'Weld',       percentage: '95', notes: '' },
      { status: 'G', workCenter: 'Pack',       percentage: '100', notes: '' },
    ],
  },
  'downtime-analysis': {
    status: 'Y',
    subTableData: [
      { reason: 'Machine DT - Equipment',  percentage: '7.6',  notes: '' },
      { reason: 'Machine DT - Tooling',    percentage: '16.0', notes: 'WM514 1 hour robot faults' },
      { reason: 'Set Up DT - Die Change',  percentage: '43.9', notes: '' },
      { reason: 'Set Up DT - Cell',        percentage: '10.0', notes: 'Quality issue, cut etch' },
      { reason: 'Set Up DT - Coil Change', percentage: '4.0',  notes: '' },
    ],
  },
  'operations-update':    { status: 'Y', comments: 'Auto Area - <strong>P102</strong> down for feeder repair.\n<span style="color:rgb(239,68,68)">P115</span> C199AA running.' },
  'mfg-mishit-reports':   { status: 'G', comments: 'None' },
  'housekeeping':         { status: 'Y', comments: 'EOS housekeeping completed.' },
  'change-overs':         { status: 'G', comments: 'P106, P115, P108 die changes complete.' },
  'tooling':              { status: 'G', comments: 'C2750 completed. Welded and ground upper/lower cam.' },
  'maintenance':          { status: 'G', comments: 'Routine PMs done.' },
  'me-critical':          { status: 'G', comments: 'No critical M&E.' },
  'quality-concerns': {
    status: 'G',
    subTableData: [
      { workcenterCode: 'A301',  partNumber: '20020A',     statusNotes: 'Good' },
      { workcenterCode: 'A304',  partNumber: '68517510AC', statusNotes: 'Good' },
    ],
  },
};

(async () => {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Build dates: today and yesterday, as a 2-day mini test
  const today = new Date();
  const dates = [];
  for (let i = 2; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(TEMPLATE_DIR, 'GAP-Template.xlsx'));
  const templateSheet = wb.getWorksheet('Template');

  for (const date of dates) {
    const sheetName = `${dayName(date)} ${shortDate(date)}`.slice(0, 31);
    const newSheet  = cloneTemplateSheet(templateSheet, wb, sheetName);
    newSheet.getCell(`A${TITLE_ROW}`).value =
      `GAP Daily Update - ${dayName(date)} ${shortDate(date)} - Submitted to Executive Team by 5 pm`;

    for (const def of getSectionsForPlant('GAP')) {
      fillSection(newSheet, def, MOCK[def.id] || {});
    }
  }
  wb.removeWorksheet(templateSheet.id);

  const filename = `GAP Daily Report Wk ${shortDate(dates[0])}.xlsx`;
  const outPath  = join(OUT_DIR, filename);
  await wb.xlsx.writeFile(outPath);
  console.log(`✓ Wrote test workbook: ${outPath}`);
  console.log(`  Sheets: ${wb.worksheets.map(w => w.name).join(', ')}`);
})().catch(err => { console.error('FAIL:', err); process.exit(1); });
