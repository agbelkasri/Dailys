/**
 * Historical Excel import
 * ───────────────────────
 * Reads .xlsx files in the same shape as `<Plant> Daily Report Wk M.D.YY.xlsx`
 * (one workbook per plant per week, with Monday–Friday as separate sheets) and
 * writes each day's data into Firestore at /reports/{plantId}_{date}.
 *
 * Inverse of `weeklyBackup.js` — uses the same LAYOUT cell map so any file
 * the backup script produced (or any file the supervisors maintain in the
 * same template) round-trips cleanly.
 *
 * Usage:
 *   # Drop your .xlsx files into scripts/historical/ then:
 *   node scripts/importHistorical.js --dry-run        # preview only
 *   node scripts/importHistorical.js                  # skip-existing default
 *   node scripts/importHistorical.js --overwrite      # force overwrite
 *   node scripts/importHistorical.js --dir <path>     # custom directory
 *   node scripts/importHistorical.js --plant GAP      # only one plant
 *
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT  – full contents of a Firebase service-account JSON
 */

import { initializeApp, cert }      from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import ExcelJS                      from 'exceljs';
import { readdirSync, existsSync }  from 'fs';
import { join, dirname }            from 'path';
import { fileURLToPath }            from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase ─────────────────────────────────────────────────────────────────
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT env var is not set.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

// ── Cell layout (mirrors weeklyBackup.js) ────────────────────────────────────
const LAYOUT = {
  'ehs':                       { row: 8 },
  'staffing-issues':           { row: 11 },
  'current-year-program-eop':  { row: 27 },
  'prem-freight':              { row: 29 },
  'on-time-delivery':          { row: 32 },
  'customer-invty-status':     { row: 35, subTable: 'CUSTOMER_INVENTORY', subRow: 37, maxSubRows: 20 },
  'service':                   { row: 57 },
  'supplier-issues':           { row: 60 },
  'labor-overtime':            { row: 63 },
  'daily-efficiency-oee':      { row: 71, subTable: 'EFFICIENCY',        subRow: 72, maxSubRows: 5  },
  'downtime-analysis':         { row: 77, subTable: 'DOWNTIME',          subRow: 79, maxSubRows: 5  },
  'operations-update':         { row: 84 },
  'mfg-mishit-reports':        { row: 102 },
  'housekeeping':              { row: 105 },
  'change-overs':              { row: 108 },
  'tooling':                   { row: 113 },
  'maintenance':               { row: 121 },
  'quality-concerns':          { row: 125 },
};

const STATUS_BY_COLOR = {
  'FF008A3E': 'G',
  'FFFFFF00': 'Y',
  'FFC00000': 'R',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Extract a YYYY-MM-DD date from a sheet name.
 * weeklyBackup.js names sheets like "Monday 5.25.26" — the date lives in
 * the sheet name itself, which is more reliable than recomputing it from
 * the week-start filename (which would break across holiday weeks where
 * a day is missing).
 *
 * Falls back to null if the sheet name doesn't contain a parseable date.
 */
function dateFromSheetName(sheetName) {
  const m = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  return isoDate(m[3], m[1], m[2]);
}

// ── CLI arg parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name)  { return args.includes(`--${name}`); }
function value(name) { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; }

const opts = {
  dir:       value('dir')   || join(__dirname, 'historical'),
  dryRun:    flag('dry-run'),
  overwrite: flag('overwrite'),
  plant:     value('plant'),
};

console.log(`Importing from: ${opts.dir}`);
console.log(`Mode: ${opts.dryRun ? 'DRY RUN' : (opts.overwrite ? 'OVERWRITE' : 'SKIP-EXISTING')}`);
if (opts.plant) console.log(`Plant filter: ${opts.plant}`);
console.log();

if (!existsSync(opts.dir)) {
  console.error(`Directory not found: ${opts.dir}`);
  console.error(`Create it and drop your .xlsx files in, then re-run.`);
  process.exit(1);
}

// ── Cell readers ─────────────────────────────────────────────────────────────

/** Read a cell's text, handling string / number / richText / formula. */
function readText(cell) {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (v.richText)  return v.richText.map(rt => rt.text).join('').trim();
  if (v.text)      return String(v.text).trim();
  if (v.formula)   return v.result != null ? String(v.result).trim() : '';
  if (v.hyperlink) return String(v.text || v.hyperlink).trim();
  return String(v).trim();
}

/** Read DL status — first try cell text (G/Y/R), then fall back to fill color. */
function readStatus(cell) {
  const text = readText(cell).toUpperCase();
  if (['G', 'Y', 'R'].includes(text)) return text;
  const fill = cell.fill;
  if (fill?.type === 'pattern' && fill.fgColor?.argb) {
    return STATUS_BY_COLOR[fill.fgColor.argb.toUpperCase()] || '';
  }
  return '';
}

/** Read a percentage cell — Excel may store as 0.85 (formatted "85%") or 85. */
function readPercentage(cell) {
  const v = cell.value;
  if (typeof v === 'number') {
    return v <= 1 ? (v * 100).toFixed(0) + '%' : v.toFixed(0) + '%';
  }
  return readText(cell);
}

/** Escape & wrap plain text from a cell into the same lightweight HTML the
 *  rich-text editor produces. Newlines become paragraph breaks. */
function plainToHtml(text) {
  if (!text) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\r?\n/)
    .map(line => `<p>${esc(line) || '<br>'}</p>`)
    .join('');
}

// ── Sub-table parsers (inverse of fillCustomerInventory / fillEfficiency / fillDowntime) ──

function parseCustomerInventory(ws, startRow, maxRows) {
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    const r = startRow + i;
    const row = {
      status:        readStatus(ws.getCell(`D${r}`)),
      customer:      readText(ws.getCell(`E${r}`)),
      programNumber: readText(ws.getCell(`F${r}`)),
      partsSupplied: readText(ws.getCell(`G${r}`)),
      coverageNotes: readText(ws.getCell(`H${r}`)),
    };
    if (Object.values(row).some(v => v)) rows.push(row);
  }
  return rows;
}

function parseEfficiency(ws, startRow, maxRows) {
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    const r = startRow + i;
    const row = {
      status:     readStatus(ws.getCell(`D${r}`)),
      workCenter: readText(ws.getCell(`E${r}`)),
      percentage: readPercentage(ws.getCell(`F${r}`)),
      notes:      readText(ws.getCell(`G${r}`)),
    };
    if (Object.values(row).some(v => v)) rows.push(row);
  }
  return rows;
}

function parseDowntime(ws, startRow, maxRows) {
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    const r = startRow + i;
    const row = {
      reason:     readText(ws.getCell(`E${r}`)),
      percentage: readPercentage(ws.getCell(`G${r}`)),
      notes:      readText(ws.getCell(`H${r}`)),
    };
    if (Object.values(row).some(v => v)) rows.push(row);
  }
  return rows;
}

/** Quality is stored as a free-text dump in E125 with lines like:
 *    "WC | Part Number | Status / Notes"
 *  Convert each pipe-separated line back into a sub-table row. */
function parseQualityText(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|').map(s => s.trim());
      return {
        workcenterCode: parts[0] || '',
        partNumber:     parts[1] || '',
        statusNotes:    parts.slice(2).join(' | ') || '',
      };
    })
    .filter(r => r.workcenterCode || r.partNumber || r.statusNotes);
}

// ── Filename + date helpers ──────────────────────────────────────────────────

/**
 * Parses filenames like:
 *   "GAP Daily Report Wk 3.9.26.xlsx"
 *   "EAP-Daily-Update-2026-03-09.xlsx"   (old single-day format, still handled)
 *   "GAP Daily Report Wk 03.09.2026.xlsx"
 *
 * Returns { plant, weekStart (YYYY-MM-DD) } or null if unrecognized.
 */
function parseFilename(filename) {
  // Wk M.D.YY format
  let m = filename.match(/^(EAP|GAP|SLP)[\s_-]*Daily[\s_-]*Report[\s_-]*Wk[\s_-]*(\d{1,2})\.(\d{1,2})\.(\d{2,4})\.xlsx$/i);
  if (m) {
    const [, plant, mo, d, y] = m;
    return { plant: plant.toUpperCase(), weekStart: isoDate(y, mo, d) };
  }
  // Single-day format: "<Plant>-Daily-Update-YYYY-MM-DD.xlsx"
  m = filename.match(/^(EAP|GAP|SLP)[\s_-]*Daily[\s_-]*Update[\s_-]*(\d{4})-(\d{2})-(\d{2})\.xlsx$/i);
  if (m) {
    const [, plant, y, mo, d] = m;
    return { plant: plant.toUpperCase(), singleDay: `${y}-${mo}-${d}` };
  }
  return null;
}

function isoDate(y, mo, d) {
  let year = String(y);
  if (year.length === 2) year = '20' + year;
  return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Per-sheet parser ─────────────────────────────────────────────────────────

function parseSheetToSections(ws) {
  const sections = {};
  for (const [sectionId, cfg] of Object.entries(LAYOUT)) {
    const r = cfg.row;
    const status   = readStatus(ws.getCell(`D${r}`));
    const rawText  = readText(ws.getCell(`E${r}`));
    const comments = plainToHtml(rawText);

    let subTableData = [];
    if (cfg.subTable === 'CUSTOMER_INVENTORY') {
      subTableData = parseCustomerInventory(ws, cfg.subRow, cfg.maxSubRows);
    } else if (cfg.subTable === 'EFFICIENCY') {
      subTableData = parseEfficiency(ws, cfg.subRow, cfg.maxSubRows);
    } else if (cfg.subTable === 'DOWNTIME') {
      subTableData = parseDowntime(ws, cfg.subRow, cfg.maxSubRows);
    } else if (sectionId === 'quality-concerns') {
      subTableData = parseQualityText(rawText);
    }

    // Only emit if there's something — keeps Firestore lean
    if (!status && !rawText && subTableData.length === 0) continue;

    sections[sectionId] = {
      sectionId,
      status,
      comments,
      subTableData,
    };
  }
  return sections;
}

// ── Firestore writer ─────────────────────────────────────────────────────────

async function writeReport(plantId, date, sections) {
  const reportId  = `${plantId}_${date}`;
  const reportRef = db.doc(`reports/${reportId}`);

  // Existence check
  const existing = await reportRef.get();
  if (existing.exists && !opts.overwrite) {
    return { skipped: 'exists' };
  }

  if (opts.dryRun) {
    return { dryRun: true, sectionCount: Object.keys(sections).length };
  }

  await reportRef.set({
    reportDate: date,
    plantId,
    importedFromExcel: true,
    importedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const batch = db.batch();
  for (const [sectionId, sectionData] of Object.entries(sections)) {
    const sref = db.doc(`reports/${reportId}/sections/${sectionId}`);
    batch.set(sref, {
      ...sectionData,
      importedFromExcel: true,
      importedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();

  return { written: true, sectionCount: Object.keys(sections).length };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const stats = { written: 0, skipped: 0, errors: 0, days: 0 };

const files = readdirSync(opts.dir).filter(f => /\.xlsx$/i.test(f) && !f.startsWith('~'));
console.log(`Found ${files.length} .xlsx file(s)\n`);

for (const file of files) {
  const parsed = parseFilename(file);
  if (!parsed) {
    console.log(`⚠ Skip ${file} — unrecognized filename pattern`);
    stats.errors++;
    continue;
  }
  if (opts.plant && parsed.plant !== opts.plant.toUpperCase()) continue;

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(join(opts.dir, file));
  } catch (err) {
    console.error(`✗ Failed to open ${file}: ${err.message}`);
    stats.errors++;
    continue;
  }

  console.log(`📄 ${file} → ${parsed.plant} ${parsed.weekStart || parsed.singleDay}`);

  // Single-day file → import the lone sheet
  if (parsed.singleDay) {
    const ws = wb.worksheets[0];
    if (!ws) { console.log('  (no sheets)'); continue; }
    const sections = parseSheetToSections(ws);
    const res = await writeReport(parsed.plant, parsed.singleDay, sections);
    logResult(parsed.singleDay, sections, res);
    continue;
  }

  // Weekly file → walk every sheet, parse those that start with a day name
  for (const ws of wb.worksheets) {
    const dayPrefix = DAY_NAMES.find(d => ws.name.startsWith(d));
    if (!dayPrefix) {
      // Non-day sheet (e.g., "Template" or a tab the user added) — skip silently
      continue;
    }

    // Prefer the date encoded in the sheet name; fall back to week-start +
    // weekday offset if the sheet name is just "Monday" with no date.
    const dateFromName = dateFromSheetName(ws.name);
    const dayIdx = DAY_NAMES.indexOf(dayPrefix);
    const date = dateFromName || addDays(parsed.weekStart, dayIdx);

    const sections = parseSheetToSections(ws);
    if (Object.keys(sections).length === 0) {
      console.log(`  - ${ws.name} (${date}): empty sheet, skip`);
      continue;
    }
    const res = await writeReport(parsed.plant, date, sections);
    logResult(`${ws.name} (${date})`, sections, res);
  }
}

console.log(`\n──────── Summary ────────`);
console.log(`Written: ${stats.written}   Skipped: ${stats.skipped}   Errors: ${stats.errors}`);
console.log(`Total days processed: ${stats.days}`);
if (opts.dryRun) console.log(`(dry-run — no Firestore writes were made)`);

function logResult(label, sections, res) {
  stats.days++;
  const sCount = Object.keys(sections).length;
  if (res.skipped) {
    console.log(`  - ${label}: SKIP (${res.skipped}, ${sCount} sections in file)`);
    stats.skipped++;
  } else if (res.dryRun) {
    console.log(`  - ${label}: DRY-RUN would write ${sCount} sections`);
  } else if (res.written) {
    console.log(`  - ${label}: WROTE ${sCount} sections`);
    stats.written++;
  }
}

process.exit(0);
