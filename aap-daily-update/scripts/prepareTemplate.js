/**
 * One-time prep script.
 * Reads scripts/templates/GAP-Template.xlsx (the user's example file with real
 * data) and writes a *clean* version back to the same path:
 *   • Keeps only the "Template" sheet (deletes Mon/Tue/Wed/Thu/Fri data sheets)
 *   • Clears status (col D) and comment (col E onward) data values
 *   • Preserves all formatting, merges, fonts, borders, conditional formats,
 *     row heights, column widths, header rows, sub-table column headers
 *
 * Run manually:  node scripts/prepareTemplate.js
 */

import ExcelJS from 'exceljs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_FN  = join(__dirname, 'templates', 'GAP-Template.xlsx');

/** Cells (and ranges) that are STATIC in the template — preserve their values. */
const KEEP_VALUES = new Set([
  // Top header block
  'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1', 'L1', 'M1', 'N1', 'O1', 'P1',
  'E2', 'F2', 'G2', 'H2', 'I2', 'J2', 'K2', 'L2', 'M2', 'N2', 'O2', 'P2',
  'A3', 'A4',
  // Column headers row (5-7 merged)
  'A5', 'A6', 'A7',
  'B5', 'B6', 'B7',
  'C5', 'C6', 'C7',
  'D5', 'D6', 'D7',
  'E5', 'E6', 'E7',
  // Section "Responsible Party" labels (col A) and "Measurable" labels (col B/C)
]);

/**
 * Section anchor rows — col A (responsible) and col B (measurable) are
 * merged across the whole section, so writing to the top-left of the merge
 * is enough to keep those labels.
 *
 * For each anchor row we keep cols A, B, C (responsible / measurable label).
 */
const SECTION_ANCHORS = [
  8,    // EHS
  11,   // Staffing Issues
  27,   // Current Year Program EOP
  29,   // Prem Freight
  32,   // On Time Delivery
  35,   // Customer Inventory Status
  57,   // Service
  60,   // Supplier Issues
  63,   // Labor / Overtime
  71,   // Daily Efficiency
  77,   // Downtime Analysis
  84,   // Operations Update
  102,  // MFG Mishit
  105,  // Housekeeping
  108,  // Change Overs
  113,  // TOOLING
  121,  // Maintenance
  125,  // Quality Concerns
];

/** Sub-table HEADER rows (these we keep as-is — column titles). */
const SUBTABLE_HEADER_ROWS = [
  35, 36,        // Customer Inventory header
  71,            // Daily Efficiency header
  77, 78,        // Downtime Analysis header + Daily DT row
];

/** Source sheet to use as the Template base (day sheets share a consistent
 *  layout that's easier to map to than the "Template" sheet). */
const SOURCE_SHEET = 'Monday';
const TARGET_SHEET = 'Template';

const MAIN_TITLE_ROWS = new Set([1, 2, 3, 4]);

function shouldKeepValue(addr, rowNum, colLetter) {
  if (KEEP_VALUES.has(addr)) return true;
  if (MAIN_TITLE_ROWS.has(rowNum)) return true;
  // Section header columns (A, B, C — Responsible / Measurable)
  if (SECTION_ANCHORS.includes(rowNum) && ['A', 'B', 'C'].includes(colLetter)) return true;
  // Sub-table column header rows: keep header text (cols E onward)
  if (SUBTABLE_HEADER_ROWS.includes(rowNum)) return true;
  return false;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_FN);

  // The day sheets (Monday/Tuesday/...) share a consistent layout we can map
  // section IDs onto. The literal "Template" sheet is laid out a touch
  // differently (1-row shift in Daily Efficiency / Downtime), so we use a day
  // sheet as the canonical structure and rename it to "Template".
  // First, drop the existing literal "Template" sheet so we can rename Monday.
  const existingTemplate = wb.getWorksheet(TARGET_SHEET);
  if (existingTemplate) wb.removeWorksheet(existingTemplate.id);

  const source = wb.getWorksheet(SOURCE_SHEET);
  if (!source) throw new Error(`No "${SOURCE_SHEET}" sheet in template file.`);
  source.name = TARGET_SHEET;

  // Drop every other sheet
  for (const sheet of [...wb.worksheets]) {
    if (sheet.name !== TARGET_SHEET) {
      wb.removeWorksheet(sheet.id);
    }
  }

  const ws = wb.getWorksheet(TARGET_SHEET);
  if (!ws) throw new Error(`Failed to retain "${TARGET_SHEET}" sheet.`);

  // 2a) Flatten ALL shared/formula cells to literal values.
  //     Shared-formula references break when sibling sheets are removed, and
  //     we don't need formulas in the backup output anyway.
  //     We poke at cell.model directly to avoid triggering the formula
  //     translation logic that throws on dangling shared-formula slaves.
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const m = cell.model;
      if (m && (m.formula !== undefined || m.sharedFormula !== undefined)) {
        const cached = m.result;
        cell.value = cached === undefined || cached === null ? null : cached;
      }
    });
  });

  // 2b) Clear data in non-static cells while keeping styling intact.
  //     IMPORTANT: skip merge-slave cells. Setting a slave's value to null
  //     would null the merged master too, which is how we ended up wiping
  //     the section labels in column A/B.
  ws.eachRow({ includeEmpty: false }, (row, rNum) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.type === ExcelJS.ValueType.Merge) return;
      const addr      = cell.address;
      const colLetter = addr.replace(/\d+/g, '');
      if (!shouldKeepValue(addr, rNum, colLetter)) {
        cell.value = null;
      }
    });
  });

  await wb.xlsx.writeFile(TEMPLATE_FN);
  console.log(`✓ Cleaned template written to: ${TEMPLATE_FN}`);
})().catch(err => { console.error('Failed:', err); process.exit(1); });
