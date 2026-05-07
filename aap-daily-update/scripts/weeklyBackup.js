/**
 * Weekly Excel backup script
 * ──────────────────────────
 * Reads the previous 7 days of Daily reports from Firestore for all three
 * plants (GAP, EAP, SLP) and writes ONE Excel workbook per plant per week,
 * with each day on its own sheet, using the styled GAP template under
 * scripts/templates/.
 *
 * Output:  backups/YYYY-Www/<Plant>-Daily-Report-Wk-<M.D.YY>.xlsx
 *
 * Run automatically every Monday by GitHub Actions, or manually:
 *   node scripts/weeklyBackup.js
 *
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT  – full contents of a Firebase service-account
 *                                JSON key
 */

import { initializeApp, cert }  from 'firebase-admin/app';
import { getFirestore }         from 'firebase-admin/firestore';
import ExcelJS                  from 'exceljs';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname }        from 'path';
import { fileURLToPath }        from 'url';

import { getSectionsForPlant, SECTION_TYPES } from '../src/constants/sections.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = join(__dirname, '..');
const TEMPLATE_DIR = join(__dirname, 'templates');
const PLANTS     = ['GAP', 'EAP', 'SLP'];

// ── Firebase ─────────────────────────────────────────────────────────────────

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  console.error('Set it to the full contents of your Firebase service-account JSON key.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

// ── Template layout (Excel-row mapping for each section) ─────────────────────
//
// Row anchors are 1-indexed. The layout mirrors the original GAP weekly Excel
// templates the user has been maintaining. For sub-table sections we also
// record where the sub-table data starts and how many data rows fit.
//
// Sections that don't appear in the template (e.g., me-critical) are silently
// skipped — their data will not be exported until the template is updated.

const LAYOUT = {
  'ehs':                       { row: 8 },
  'staffing-issues':           { row: 11 },
  'current-year-program-eop':  { row: 27 },
  'prem-freight':              { row: 29 },
  'on-time-delivery':          { row: 32 },
  'customer-invty-status':     {
    row: 35,
    subTableType: 'CUSTOMER_INVENTORY',
    subTableRow: 37,
    maxSubTableRows: 20,
  },
  'service':                   { row: 57 },
  'supplier-issues':           { row: 60 },
  'labor-overtime':            { row: 63 },
  'daily-efficiency-oee':      {
    row: 71,
    subTableType: 'EFFICIENCY',
    subTableRow: 72,
    maxSubTableRows: 5,
  },
  'downtime-analysis':         {
    row: 77,
    subTableType: 'DOWNTIME',
    subTableRow: 79,
    maxSubTableRows: 5,
  },
  'operations-update':         { row: 84 },
  'mfg-mishit-reports':        { row: 102 },
  'housekeeping':              { row: 105 },
  'change-overs':              { row: 108 },
  'tooling':                   { row: 113 },
  'maintenance':               { row: 121 },
  'quality-concerns':          { row: 125 },  // free-text quality dump in E125
};

const TITLE_ROW = 3;  // "GAP Daily Update - Submitted to Executive Team by 5 pm"

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function getBackupDates() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 - i));
    return toDateStr(d);
  });
}

function isoWeekLabel(dateStr) {
  const d        = new Date(dateStr);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const yearStart = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round(
    ((thursday - yearStart) / 86_400_000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7
  );
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                   'Thursday', 'Friday', 'Saturday'];

function dayName(dateStr) {
  // Treat the date as midnight UTC so we don't accidentally land on the
  // previous calendar day in negative-offset zones.
  const d = new Date(dateStr + 'T12:00:00Z');
  return DAY_NAMES[d.getUTCDay()];
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}.${String(d.getUTCFullYear()).slice(-2)}`;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Strip HTML tags from rich-text fields; preserve line breaks. */
function stripHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<\/div>\s*<div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ── Firestore fetch ───────────────────────────────────────────────────────────

async function fetchReport(plantId, date) {
  const snap = await db
    .collection('reports')
    .doc(`${plantId}_${date}`)
    .collection('sections')
    .get();
  if (snap.empty) return null;
  const data = {};
  snap.forEach(doc => { data[doc.id] = doc.data(); });
  return data;
}

// ── Sheet cloning ─────────────────────────────────────────────────────────────

/**
 * Manually clone one worksheet (cells, styles, merges, row heights, column
 * widths) into a different name in the same workbook. ExcelJS doesn't expose
 * a built-in duplicate, so we copy the bits we care about by hand.
 */
function cloneTemplateSheet(srcWs, destWb, destName) {
  const newWs = destWb.addWorksheet(destName);

  // Page setup / view
  if (srcWs.pageSetup)  Object.assign(newWs.pageSetup, srcWs.pageSetup);
  if (srcWs.headerFooter) Object.assign(newWs.headerFooter, srcWs.headerFooter);
  if (srcWs.views)      newWs.views      = JSON.parse(JSON.stringify(srcWs.views));
  if (srcWs.properties) Object.assign(newWs.properties, srcWs.properties);

  // Column widths/styles
  for (let c = 1; c <= srcWs.columnCount; c++) {
    const sc = srcWs.getColumn(c);
    const dc = newWs.getColumn(c);
    if (sc.width !== undefined) dc.width = sc.width;
    if (sc.hidden) dc.hidden = sc.hidden;
    if (sc.style) dc.style = JSON.parse(JSON.stringify(sc.style));
  }

  // Cells + row heights
  srcWs.eachRow({ includeEmpty: true }, (row, rNum) => {
    const newRow = newWs.getRow(rNum);
    if (row.height !== undefined) newRow.height = row.height;

    row.eachCell({ includeEmpty: true }, (cell, cNum) => {
      const newCell = newRow.getCell(cNum);
      // Skip merge-slave cells — they share the master's value.
      if (cell.type !== ExcelJS.ValueType.Merge) {
        newCell.value = cell.value;
      }
      if (cell.style) {
        newCell.style = JSON.parse(JSON.stringify(cell.style));
      }
    });
  });

  // Merges
  const merges = srcWs.model?.merges || [];
  for (const range of merges) {
    try { newWs.mergeCells(range); } catch (_) { /* ignore */ }
  }

  // Conditional formatting (this is what paints the G/Y/R status cells).
  // Only keep simple rule types that the ExcelJS writer can serialise
  // reliably — strip databar/iconSet/colorScale which can contain null
  // cfvo refs that crash the writer.
  if (Array.isArray(srcWs.conditionalFormattings)) {
    const safe = ['expression', 'cellIs', 'containsText', 'notContainsText',
                  'beginsWith', 'endsWith', 'duplicateValues', 'uniqueValues',
                  'top10', 'aboveAverage', 'timePeriod'];
    const cf = JSON.parse(JSON.stringify(srcWs.conditionalFormattings))
      .map(group => ({
        ...group,
        rules: group.rules.filter(r => safe.includes(r.type)),
      }))
      .filter(group => group.rules.length > 0);
    newWs.conditionalFormattings = cf;
  }

  return newWs;
}

// ── Filling a day sheet ───────────────────────────────────────────────────────

// Manual G/Y/R fills — match the colors used by the template's conditional
// formatting rules. We apply these directly so that status cells outside the
// CF coverage range (e.g., Customer Inventory rows D37–D56) still get colored.
const STATUS_FILLS = {
  G: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008A3E' } }, // green
  Y: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }, // yellow
  R: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } }, // red
};

function setStatusCell(ws, row, status) {
  if (!status) return;
  const letter = String(status).trim().toUpperCase().charAt(0);
  if (!letter) return;
  const cell = ws.getCell(`D${row}`);
  cell.value = letter;
  if (STATUS_FILLS[letter]) {
    // Preserve other style props (font, alignment, border) and only swap fill.
    cell.style = { ...(cell.style || {}), fill: STATUS_FILLS[letter] };
    // White, bold text reads better on the dark green/red backgrounds.
    if (letter === 'G' || letter === 'R') {
      cell.style = {
        ...cell.style,
        font: { ...(cell.style.font || {}), bold: true, color: { argb: 'FFFFFFFF' } },
      };
    }
  }
}

function setCommentsCell(ws, row, content) {
  if (!content) return;
  ws.getCell(`E${row}`).value = content;
}

function fillCustomerInventory(ws, startRow, rows, maxRows) {
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const r = startRow + i;
    const row = rows[i] || {};
    setStatusCell(ws, r, row.status);
    if (row.customer)       ws.getCell(`E${r}`).value = row.customer;
    if (row.programNumber)  ws.getCell(`F${r}`).value = row.programNumber;
    if (row.partsSupplied !== undefined && row.partsSupplied !== '') {
      const num = Number(row.partsSupplied);
      ws.getCell(`G${r}`).value = Number.isFinite(num) ? num : row.partsSupplied;
    }
    if (row.coverageNotes)  ws.getCell(`H${r}`).value = row.coverageNotes;
  }
}

function fillEfficiency(ws, startRow, rows, maxRows) {
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const r = startRow + i;
    const row = rows[i] || {};
    setStatusCell(ws, r, row.status);
    if (row.workCenter || row.workcenter || row.workCenterGroup) {
      ws.getCell(`E${r}`).value = row.workCenter || row.workcenter || row.workCenterGroup;
    }
    if (row.percentage !== undefined && row.percentage !== '') {
      const num = parseFloat(String(row.percentage).replace('%', ''));
      ws.getCell(`F${r}`).value = Number.isFinite(num) ? (num > 1 ? num / 100 : num) : row.percentage;
    }
    if (row.notes) ws.getCell(`G${r}`).value = row.notes;
  }
}

function fillDowntime(ws, startRow, rows, maxRows) {
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const r = startRow + i;
    const row = rows[i] || {};
    if (row.reason) ws.getCell(`E${r}`).value = row.reason;
    if (row.percentage !== undefined && row.percentage !== '') {
      const num = parseFloat(String(row.percentage).replace('%', ''));
      ws.getCell(`G${r}`).value = Number.isFinite(num) ? (num > 1 ? num / 100 : num) : row.percentage;
    }
    if (row.notes) ws.getCell(`H${r}`).value = row.notes;
  }
}

function fillQualityAsText(rows) {
  if (!rows?.length) return '';
  return rows
    .map(r => `${r.workcenterCode || ''} | ${r.partNumber || ''} | ${r.statusNotes || ''}`)
    .join('\n');
}

function fillSectionInto(ws, sectionDef, sectionData) {
  const cfg = LAYOUT[sectionDef.id];
  if (!cfg) return;  // section not represented in template (e.g., me-critical)

  setStatusCell(ws, cfg.row, sectionData.status);

  const subType = sectionDef.sectionType;

  if (subType === SECTION_TYPES.CUSTOMER_INVENTORY && cfg.subTableRow) {
    fillCustomerInventory(
      ws, cfg.subTableRow,
      sectionData.subTableData || [],
      cfg.maxSubTableRows
    );
    return;
  }

  if (subType === SECTION_TYPES.EFFICIENCY && cfg.subTableRow) {
    fillEfficiency(
      ws, cfg.subTableRow,
      sectionData.subTableData || [],
      cfg.maxSubTableRows
    );
    return;
  }

  if (subType === SECTION_TYPES.DOWNTIME && cfg.subTableRow) {
    fillDowntime(
      ws, cfg.subTableRow,
      sectionData.subTableData || [],
      cfg.maxSubTableRows
    );
    return;
  }

  if (subType === SECTION_TYPES.QUALITY) {
    setCommentsCell(ws, cfg.row, fillQualityAsText(sectionData.subTableData));
    return;
  }

  // NORMAL sections
  setCommentsCell(ws, cfg.row, stripHtml(sectionData.comments || ''));
}

function setSheetTitle(ws, plantId, dateStr) {
  ws.getCell(`A${TITLE_ROW}`).value =
    `${plantId} Daily Update - ${dayName(dateStr)} ${shortDate(dateStr)} - Submitted to Executive Team by 5 pm`;
}

// ── Build per-plant workbook ──────────────────────────────────────────────────

function templatePathFor(plantId) {
  // EAP and SLP fall back to the GAP template until plant-specific templates
  // are added. The structure matches across plants; only the column-A
  // "Responsible Party" labels differ, and those are static in the template.
  const specific = join(TEMPLATE_DIR, `${plantId}-Template.xlsx`);
  return existsSync(specific) ? specific : join(TEMPLATE_DIR, 'GAP-Template.xlsx');
}

async function buildPlantWorkbook(plantId, dates) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePathFor(plantId));
  const templateSheet = wb.getWorksheet('Template');
  if (!templateSheet) throw new Error(`No "Template" sheet in template for ${plantId}`);

  const populatedDays = [];

  for (const date of dates) {
    const data = await fetchReport(plantId, date);
    if (!data) continue;

    const sheetName = `${dayName(date)} ${shortDate(date)}`.slice(0, 31);
    // ExcelJS sheet names cap at 31 chars; safe for "Wednesday 3.11.26".
    const newSheet = cloneTemplateSheet(templateSheet, wb, sheetName);

    setSheetTitle(newSheet, plantId, date);

    const sections = getSectionsForPlant(plantId);
    for (const sectionDef of sections) {
      fillSectionInto(newSheet, sectionDef, data[sectionDef.id] || {});
    }

    populatedDays.push(date);
  }

  // Drop the empty template sheet so the output contains only day sheets.
  if (populatedDays.length > 0) {
    wb.removeWorksheet(templateSheet.id);
  }

  return { wb, populatedDays };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dates     = getBackupDates();
  const weekLabel = isoWeekLabel(dates[0]);
  const outDir    = join(REPO_ROOT, 'backups', weekLabel);

  console.log(`\nWeekly backup — ${weekLabel}`);
  console.log(`Date range : ${dates[0]} → ${dates[dates.length - 1]}`);
  console.log(`Output dir : backups/${weekLabel}/\n`);

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  let saved = 0;
  let skipped = 0;

  for (const plantId of PLANTS) {
    const { wb, populatedDays } = await buildPlantWorkbook(plantId, dates);

    if (populatedDays.length === 0) {
      console.log(`  --  ${plantId}  (no reports for any day in range)`);
      skipped++;
      continue;
    }

    // File name: "GAP Daily Report Wk 3.9.26.xlsx" — match the user's
    // existing convention (week-of label = the Monday short-date).
    const weekShort = shortDate(dates[0]);
    const filename  = `${plantId} Daily Report Wk ${weekShort}.xlsx`;
    const outPath   = join(outDir, filename);
    await wb.xlsx.writeFile(outPath);

    console.log(`  ✓   ${plantId}  ${populatedDays.length} day(s)  →  ${filename}`);
    saved++;
  }

  console.log(`\n${saved} workbook(s) saved, ${skipped} plant(s) skipped (no data).`);
}

main().catch(err => {
  console.error('\nBackup failed:', err);
  process.exit(1);
});
