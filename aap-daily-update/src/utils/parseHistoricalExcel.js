/**
 * Historical Excel parser — pure functions, browser-safe.
 *
 * Used by both:
 *   - scripts/importHistorical.js   (Node CLI, writes via firebase-admin)
 *   - src/components/admin/HistoricalImport.jsx (admin UI, writes via the
 *     web SDK from an authenticated session)
 *
 * Reads .xlsx files in the same shape weeklyBackup.js writes:
 *   "<Plant> Daily Report Wk M.D.YY.xlsx" with Monday–Friday sheets inside.
 *
 * Layout mirrors weeklyBackup.js exactly so the round-trip is lossless.
 */

// ── Layout (1-indexed rows in the template) ─────────────────────────────────
export const LAYOUT = {
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

/**
 * Map a sheet name's leading day token to a Mon–Fri index (0–4), or null.
 * Tolerates full names AND abbreviations seen across older/newer templates:
 *   Mon / Monday
 *   Tue / Tues / Tuesday
 *   Wed / Weds / Wednesday
 *   Thu / Thur / Thurs / Thursday
 *   Fri / Friday
 * Matching is on the leading letters (case-insensitive), so a trailing
 * date like "Mon 1.12" or "Tues 1.13" still resolves correctly.
 */
const DAY_MATCHERS = [
  { idx: 0, re: /^mon/i },
  { idx: 1, re: /^tue/i },
  { idx: 2, re: /^wed/i },
  { idx: 3, re: /^thu/i },
  { idx: 4, re: /^fri/i },
];

export function dayIndexFromSheetName(sheetName) {
  const t = (sheetName || '').trim();
  for (const m of DAY_MATCHERS) if (m.re.test(t)) return m.idx;
  return null;
}

// ── Cell readers ────────────────────────────────────────────────────────────

/** Read a cell's text, handling string / number / richText / formula / etc. */
export function readText(cell) {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string')  return v.trim();
  if (typeof v === 'number')  return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date)      return v.toISOString().split('T')[0];
  if (v.richText)  return v.richText.map(rt => rt.text).join('').trim();
  if (v.text)      return String(v.text).trim();
  if (v.formula)   return v.result != null ? String(v.result).trim() : '';
  if (v.hyperlink) return String(v.text || v.hyperlink).trim();
  return String(v).trim();
}

/** Read DL status — cell text first (G/Y/R), then fall back to fill color. */
export function readStatus(cell) {
  const text = readText(cell).toUpperCase();
  if (text === 'G' || text === 'Y' || text === 'R') return text;
  const fill = cell.fill;
  if (fill?.type === 'pattern' && fill.fgColor?.argb) {
    return STATUS_BY_COLOR[fill.fgColor.argb.toUpperCase()] || '';
  }
  return '';
}

/** Read a percentage cell — Excel stores as 0.85 OR 85 depending on format. */
export function readPercentage(cell) {
  const v = cell.value;
  if (typeof v === 'number') {
    return v <= 1 ? (v * 100).toFixed(0) + '%' : v.toFixed(0) + '%';
  }
  return readText(cell);
}

/** Convert plain text from a cell into the lightweight HTML the rich-text
 *  editor produces. Newlines become paragraph breaks. */
export function plainToHtml(text) {
  if (!text) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\r?\n/)
    .map(line => `<p>${esc(line) || '<br>'}</p>`)
    .join('');
}

// ── Sub-table parsers (inverse of fillCustomerInventory/Efficiency/Downtime) ──

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

/** Quality cell (E125) is a free-text dump like "WC | Part | Notes" per line. */
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

// ── Filename + date helpers ─────────────────────────────────────────────────

/** Returns YYYY-MM-DD given any of M / MM / D / DD / YY / YYYY components. */
export function isoDate(y, mo, d) {
  let year = String(y);
  if (year.length === 2) year = '20' + year;
  return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Add N days to a YYYY-MM-DD string, returning the new ISO date. */
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Parse a filename — supports both shapes:
 *   "GAP Daily Report Wk 3.9.26.xlsx"           → { plant, weekStart }
 *   "EAP-Daily-Update-2026-03-09.xlsx"          → { plant, singleDay }
 * Returns null on no match.
 */
export function parseFilename(filename) {
  let m = filename.match(/^(EAP|GAP|SLP)[\s_-]*Daily[\s_-]*Report[\s_-]*Wk[\s_-]*(\d{1,2})\.(\d{1,2})\.(\d{2,4})\.xlsx$/i);
  if (m) {
    return { plant: m[1].toUpperCase(), weekStart: isoDate(m[4], m[2], m[3]) };
  }
  m = filename.match(/^(EAP|GAP|SLP)[\s_-]*Daily[\s_-]*Update[\s_-]*(\d{4})-(\d{2})-(\d{2})\.xlsx$/i);
  if (m) {
    return { plant: m[1].toUpperCase(), singleDay: `${m[2]}-${m[3]}-${m[4]}` };
  }
  return null;
}

/**
 * Pull the date out of a sheet name. Handles both the full
 * "Monday 5.25.26" (M.D.YY) form and the abbreviated "Mon 1.12" (M.D,
 * no year) form. For the no-year form, `fallbackYear` (derived from the
 * filename's week-start) supplies the year. Returns null if no date.
 */
export function dateFromSheetName(sheetName, fallbackYear) {
  // Full M.D.YY
  let m = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) return isoDate(m[3], m[1], m[2]);
  // M.D only — borrow the year from the week-start
  m = sheetName.match(/(\d{1,2})\.(\d{1,2})(?!\d)/);
  if (m && fallbackYear) return isoDate(fallbackYear, m[1], m[2]);
  return null;
}

// ── Public entry points ─────────────────────────────────────────────────────

/**
 * Parse a single worksheet into a { [sectionId]: sectionData } map.
 * Sections with no data (no status, no text, no sub-rows) are omitted.
 */
export function parseSheetToSections(ws) {
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

    if (!status && !rawText && subTableData.length === 0) continue;
    sections[sectionId] = { sectionId, status, comments, subTableData };
  }
  return sections;
}

/**
 * Walk an entire workbook and emit one day-record per parseable sheet.
 *
 *   parseWorkbook(wb, filename)
 *     → [{ plant, date, sheetName, sections }, ...]
 *
 * Empty sheets or sheets without a recognizable day prefix are skipped.
 * Returns `[]` if the filename doesn't match a known pattern.
 */
export function parseWorkbook(wb, filename) {
  const parsed = parseFilename(filename);
  if (!parsed) return [];
  const { plant, weekStart, singleDay } = parsed;
  const days = [];

  // Single-day legacy file — import the first worksheet
  if (singleDay) {
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const sections = parseSheetToSections(ws);
    if (Object.keys(sections).length > 0) {
      days.push({ plant, date: singleDay, sheetName: ws.name, sections });
    }
    return days;
  }

  // Weekly file — walk every sheet, accept any whose name leads with a
  // weekday token (full or abbreviated). Date comes from the sheet name
  // when present, else week-start + weekday offset.
  const fallbackYear = weekStart.slice(0, 4);
  for (const ws of wb.worksheets) {
    const dayIdx = dayIndexFromSheetName(ws.name);
    if (dayIdx == null) continue;
    const date = dateFromSheetName(ws.name, fallbackYear) || addDays(weekStart, dayIdx);
    const sections = parseSheetToSections(ws);
    if (Object.keys(sections).length === 0) continue;
    days.push({ plant, date, sheetName: ws.name, sections });
  }
  return days;
}
