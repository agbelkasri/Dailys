import { LABOR_TYPE_TO_CATEGORY } from '../constants/turnoverMonthly';

// Parse a "Turnover_Tracker" workbook (an ExcelJS Workbook that has already had
// `.xlsx.load()` called on it) into flat rows the service can group + write.
//
// Returns:
//   {
//     baseline: [{ plantId, category, headcount }],
//     monthly:  [{ plantId, month: "YYYY-MM", category, headcount, terminations }],
//     warnings: string[],
//   }

// Case- and separator-insensitive worksheet lookup.
function findSheet(wb, name) {
  const target = name.toLowerCase().replace(/[\s_]+/g, '');
  return wb.worksheets.find(
    ws => ws.name.toLowerCase().replace(/[\s_]+/g, '') === target
  ) || null;
}

// Unwrap an ExcelJS cell value to a primitive: handles rich text and formulas.
function cellText(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('result' in v) return v.result ?? '';
    if ('text' in v)   return v.text ?? '';
  }
  return v;
}

function num(cell) {
  let v = cellText(cell);
  if (v === '' || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// { normalizedHeaderText: columnNumber } for the given header row.
function headerMap(sheet, headerRow = 1) {
  const map = {};
  sheet.getRow(headerRow).eachCell((cell, col) => {
    const key = String(cellText(cell)).toLowerCase().trim();
    if (key) map[key] = col;
  });
  return map;
}

// First column whose header contains `substr`.
function colContaining(hmap, substr) {
  const s = substr.toLowerCase();
  for (const [k, v] of Object.entries(hmap)) if (k.includes(s)) return v;
  return undefined;
}

// Excel month cell -> "YYYY-MM". Handles a JS Date (the usual case) or text.
function toMonthKey(cell) {
  const raw = cell?.value;
  if (raw instanceof Date) {
    return `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const v = cellText(cell);
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})/);                 // 2026-01 / 2026-01-15
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);         // 1/15/2026
  if (m) return `${m[3]}-${String(+m[1]).padStart(2, '0')}`;
  const d = new Date(s);                                 // "Jan 2026", etc.
  if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return null;
}

function categoryFor(laborTypeRaw) {
  const key = String(laborTypeRaw || '').toLowerCase().trim();
  return LABOR_TYPE_TO_CATEGORY[key] || null;           // null => skip (e.g. "Total")
}

export function parseTurnoverTracker(wb) {
  const warnings = [];
  const baseline = [];
  const monthly = [];

  // ---- Baseline sheet (Dec-2025 headcount per plant/category) ----
  const bSheet = findSheet(wb, 'Baseline');
  if (!bSheet) {
    warnings.push('No "Baseline" sheet found — YTD % can’t be computed without baseline headcounts.');
  } else {
    const h = headerMap(bSheet);
    const cPlant = h['plant'] || colContaining(h, 'plant');
    const cLabor = h['labor type'] || colContaining(h, 'labor');
    const cHc    = colContaining(h, 'baseline headcount') || colContaining(h, 'headcount');
    if (!cPlant || !cLabor || !cHc) {
      warnings.push('Baseline sheet is missing expected columns (Plant / Labor Type / Baseline Headcount).');
    } else {
      bSheet.eachRow((row, rn) => {
        if (rn === 1) return;
        const plantId = String(cellText(row.getCell(cPlant))).trim().toUpperCase();
        if (!plantId) return;
        const category = categoryFor(cellText(row.getCell(cLabor)));
        if (!category) return;                            // skip Total / blanks
        baseline.push({ plantId, category, headcount: num(row.getCell(cHc)) });
      });
    }
  }

  // ---- Monthly_Input sheet ----
  const mSheet = findSheet(wb, 'Monthly_Input');
  if (!mSheet) {
    warnings.push('No "Monthly_Input" sheet found — nothing to import.');
  } else {
    const h = headerMap(mSheet);
    const cMonth = h['month'] || colContaining(h, 'month');
    const cPlant = h['plant'] || colContaining(h, 'plant');
    const cLabor = h['labor type'] || colContaining(h, 'labor');
    const cHc    = colContaining(h, 'end-of-month headcount') || colContaining(h, 'headcount');
    const cTerm  = colContaining(h, 'terminations') || colContaining(h, 'termination');
    if (!cMonth || !cPlant || !cLabor || !cHc || !cTerm) {
      warnings.push('Monthly_Input sheet is missing expected columns.');
    } else {
      mSheet.eachRow((row, rn) => {
        if (rn === 1) return;
        const month = toMonthKey(row.getCell(cMonth));
        const plantId = String(cellText(row.getCell(cPlant))).trim().toUpperCase();
        const category = categoryFor(cellText(row.getCell(cLabor)));
        if (!month || !plantId || !category) return;      // skip incomplete rows
        monthly.push({
          plantId,
          month,
          category,
          headcount: num(row.getCell(cHc)),
          terminations: num(row.getCell(cTerm)),
        });
      });
    }
  }

  return { baseline, monthly, warnings };
}
