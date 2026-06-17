/**
 * Parses a plain-text Staffing Issues comment into an array of absence
 * draft objects ready for review in StaffingImportModal.
 *
 * Recognised formats
 * ──────────────────
 *   DL:  Jose Garcia                            ← no shift (GAP style)
 *   IDL: Chrissi Adams let sick at 7:45am.      ← no shift, trailing note
 *   DL: 1st shift: Name1, Name2                 ← with shift (EAP style)
 *   DL 1st shift - Name1, Name2 & Name3
 *   IDL: 2nd shift: Name (1/2)
 *   IDL 2nd shift – Name1 & Name2 (1/2)
 *
 * Section headers (all case-insensitive, colon optional)
 * ───────────────
 *   "Planned Absenteeism"    → type = 'planned'
 *   "Unplanned Absenteeism"  → type = 'unplanned'
 *   "Other:"                 → ignored (ongoing leaves, FMLA, etc.)
 */

/**
 * Matches DL / IDL lines with an OPTIONAL shift token.
 *
 * Groups:
 *   1 – labor type token  (DL | IDL)
 *   2 – shift digit       (1 | 2)  — undefined when absent
 *   3 – names / rest of line
 *
 * Examples that must match:
 *   "DL:  Jose Garcia"
 *   "IDL: Chrissi Adams let sick at 7:45am."
 *   "DL: 1st shift: Name1, Name2"
 *   "IDL 2nd shift - Name & Name (1/2)"
 */
const LABOR_LINE_RE = /^(IDL|DL)[: ]+(?:(\d)(?:st|nd)\s*shift\s*[:\-–—]+\s*)?(.+)$/i;

/**
 * Common lowercase words that can appear inside a proper name.
 * Stops name extraction only if the next word is NOT in this list.
 */
const NAME_CONNECTORS = /^(de|la|van|von|del|das|do|du|los|las|el|al)$/i;

/**
 * Tokens that look like names (start with uppercase) but are clearly
 * placeholders meaning "nobody". A line like `IDL: N/A` shouldn't
 * produce a phantom absence for an employee literally named N/A.
 * Compared case-insensitively against the final extracted name, with
 * any trailing punctuation already stripped.
 */
const NON_NAME_PLACEHOLDERS = new Set([
  'n/a', 'na', 'none', 'no one', 'nobody', 'tbd', 'tba',
]);

/**
 * Given a raw token like "Chrissi Adams let sick at 7:45am." extract just
 * the name (leading capitalised words) and treat the rest as a note.
 *
 * Rules:
 *  – A "name word" starts with an uppercase letter, or is a known connector.
 *  – Stop at the first word that fails both tests.
 *  – Fall back to the full token when no capitalised word is found.
 */
function splitNameAndNote(raw) {
  const words = raw.trim().split(/\s+/);
  const nameWords = [];
  for (const word of words) {
    if (/^[A-Z'"]/.test(word) || NAME_CONNECTORS.test(word)) {
      nameWords.push(word);
    } else {
      break;
    }
  }
  // Empty when no name-word was found — callers skip via `if (!name) continue`.
  // Previously this fell back to the raw token, which produced ghost absences
  // like "1st shift:" or "= 1st - 26" when the line had no actual names.
  const name  = nameWords.join(' ');
  const notes = words.slice(nameWords.length).join(' ');
  return { name, notes };
}

/** Strip HTML tags / entities so rich-text carry-forward doesn't break parsing.
 *  Block-level closers (</p>, </div>, </li>) become newlines — otherwise
 *  paragraph-wrapped content (e.g. the historical Excel importer's output)
 *  collapses onto a single line and every per-line parse fails. */
function stripHtml(str) {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * @param {string} text      - raw comments from the staffing-issues section
 * @param {object} context
 * @param {string} context.plantId  - e.g. 'EAP' | 'GAP' | 'SLP'
 * @param {string} context.date     - YYYY-MM-DD string
 * @returns {Array<object>} absence draft objects
 */
export function parseStaffingIssues(text, { plantId, date }) {
  if (!text) return [];

  const plainText = stripHtml(text);
  const lines = plainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  let currentType = null; // 'planned' | 'unplanned' | 'other'

  for (const line of lines) {
    // ── Section headers ──────────────────────────────────────────────────────
    if (/^planned\s+absenteeism/i.test(line))   { currentType = 'planned';   continue; }
    if (/^unplanned\s+absenteeism/i.test(line)) { currentType = 'unplanned'; continue; }
    if (/^other\s*:/i.test(line))               { currentType = 'other';     continue; }

    // Skip lines before any header or inside the "Other" block
    if (!currentType || currentType === 'other') continue;

    // Skip totals/headcount lines — they're parsed by parseStaffingHeadcount.
    // Without this, a line like "DL = 1st - 26, 2nd - 11" would match
    // LABOR_LINE_RE and the digits would be misread as absent-employee names.
    // Catches embedded totals too (e.g. "IDL: 2nd Shift:  & DL = 1st - 26,
    // 2nd - 11" on a single line), as well as total-only formats like
    // "DL = 23" used by GAP and SLP.
    if (isHeadcountLine(line)) continue;

    // ── Try to parse a labor line ────────────────────────────────────────────
    const m = line.match(LABOR_LINE_RE);
    if (!m) continue;

    const laborType = m[1].toUpperCase() === 'IDL' ? 'indirect' : 'direct';
    // Default to '1st' when no shift token is written (GAP style)
    const shift     = m[2] ? (m[2] === '1' ? '1st' : '2nd') : '1st';
    let   namesPart = m[3].trim();

    // Detect half-day marker anywhere in the names portion
    const isHalf = /\(\s*1\s*\/\s*2\s*\)/.test(namesPart);
    namesPart = namesPart.replace(/\(\s*1\s*\/\s*2\s*\)/g, '').trim();

    // Split on comma, " & ", or " and "
    const rawTokens = namesPart.split(/\s*,\s*|\s+&\s+|\s+and\s+/i);

    for (const rawToken of rawTokens) {
      // Strip stray leading/trailing dashes, en/em-dashes, colons, parens
      const cleaned = rawToken.replace(/^[\s\-–—:(]+|[\s\-–—:)]+$/g, '').trim();
      if (!cleaned) continue;

      // Separate the proper name from any trailing note text
      const { name, notes } = splitNameAndNote(cleaned);
      if (!name) continue;
      // Drop "N/A" / "None" / "TBD" placeholders that look like names but aren't
      if (NON_NAME_PLACEHOLDERS.has(name.toLowerCase())) continue;

      results.push({
        employeeName:   name,
        plantId,
        date,
        type:           currentType,   // 'planned' | 'unplanned'
        laborType,                      // 'direct'  | 'indirect'
        shift,                          // '1st'     | '2nd'
        duration:       isHalf ? 'half_am' : 'full',
        durationHours:  isHalf ? 4 : 8,
        reason:         '',
        employmentType: 'full_time',
        absenceTerm:    'short_term',
        notes,                          // e.g. "let sick at 7:45am."
      });
    }
  }

  return results;
}

/**
 * Headcount lines come in three shapes, in priority order:
 *
 *   1. Colon-total (EAP / GAP roster line — preferred)
 *        DL: 39                          ← "Total Employees minus LOA"
 *        IDL: 22
 *
 *   2. Shift-split (EAP "Total Present" line — fallback)
 *        DL =  1st - 26,  2nd - 11       ← roster minus today's absentees
 *        IDL = 1st - 5,   2nd - 2
 *
 *   3. Total-only with equals (GAP / SLP plain format — fallback)
 *        DL = 23
 *        IDL = 9
 *
 * The colon line wins when present because it's the stable workforce
 * roster (Total Employees minus LOA). The `=` lines represent "Total
 * Present" — roster minus today's absent — which would silently shrink
 * the denominator on days with many absentees, inflating the %. A
 * 30-weekday backtest confirmed `:` ≥ `=` on every day where both were
 * present, exactly what we'd expect with this interpretation.
 *
 * SLP doesn't write a colon line, so it falls through to the equals
 * line. For SLP that line IS the roster (no separate Total Present),
 * so the fallback is correct there too.
 */
const DL_SHIFT_RE  = /\bDL\b[^a-zA-Z\d]{0,8}1st[^a-zA-Z\d]{0,4}(\d+)[^a-zA-Z\d]{1,8}2nd[^a-zA-Z\d]{0,4}(\d+)/i;
const IDL_SHIFT_RE = /\bIDL\b[^a-zA-Z\d]{0,8}1st[^a-zA-Z\d]{0,4}(\d+)[^a-zA-Z\d]{1,8}2nd[^a-zA-Z\d]{0,4}(\d+)/i;

// Colon-total — preferred. Matches "DL: 39" / "IDL: 22". Negative
// lookahead prevents matching absentee lines like "DL: 1st shift: Nate"
// (where "1" is a digit but the lookahead sees "st" right after).
const DL_COLON_RE  = /\bDL\b\s*:\s*(\d+)\b(?!\s*(?:st|nd)\b)/i;
const IDL_COLON_RE = /\bIDL\b\s*:\s*(\d+)\b(?!\s*(?:st|nd)\b)/i;

// Equals-total — fallback. Matches "DL = 23" / "IDL = 9".
const DL_EQ_RE     = /\bDL\b\s*=\s*(\d+)\b(?!\s*(?:st|nd)\b)/i;
const IDL_EQ_RE    = /\bIDL\b\s*=\s*(\d+)\b(?!\s*(?:st|nd)\b)/i;

/** Combined predicate for "this line is a headcount totals line" — used
 *  by parseStaffingIssues() to skip it during absence parsing. */
function isHeadcountLine(line) {
  return DL_SHIFT_RE.test(line)
      || IDL_SHIFT_RE.test(line)
      || DL_COLON_RE.test(line)
      || IDL_COLON_RE.test(line)
      || DL_EQ_RE.test(line)
      || IDL_EQ_RE.test(line);
}

/**
 * Extracts plant headcount from a Staffing Issues comment. Returns the
 * resolved total per labor type (DL / IDL), preferring the colon-total
 * roster line, falling back to shift-split or equals-total when the
 * colon line isn't present.
 *
 * Shape:
 *   {
 *     DL_1st, DL_2nd,    // shift breakdown if available, else null
 *     IDL_1st, IDL_2nd,
 *     DL_total,          // resolved total used as the percentage denominator
 *     IDL_total,
 *   }
 *
 * Returns null when no headcount line of any shape is found.
 */
export function parseStaffingHeadcount(text) {
  if (!text) return null;
  const plainText = stripHtml(text);
  const lines = plainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let DL_colon = null, DL_1st = null, DL_2nd = null, DL_eq = null;
  let IDL_colon = null, IDL_1st = null, IDL_2nd = null, IDL_eq = null;

  for (const line of lines) {
    let m;
    m = line.match(DL_COLON_RE);  if (m) DL_colon = parseInt(m[1], 10);
    m = line.match(IDL_COLON_RE); if (m) IDL_colon = parseInt(m[1], 10);
    // ── DL equals/shift ─────────────────────────────────────────────────
    const dlShift = line.match(DL_SHIFT_RE);
    if (dlShift) {
      DL_1st = parseInt(dlShift[1], 10);
      DL_2nd = parseInt(dlShift[2], 10);
    } else {
      const dlT = line.match(DL_EQ_RE);
      if (dlT) DL_eq = parseInt(dlT[1], 10);
    }

    // ── IDL equals/shift ────────────────────────────────────────────────
    const idlShift = line.match(IDL_SHIFT_RE);
    if (idlShift) {
      IDL_1st = parseInt(idlShift[1], 10);
      IDL_2nd = parseInt(idlShift[2], 10);
    } else {
      const idlT = line.match(IDL_EQ_RE);
      if (idlT) IDL_eq = parseInt(idlT[1], 10);
    }
  }

  // Resolve with priority: colon (roster) > shift-sum > equals-total.
  // Colon wins because that line is explicitly "Total Employees minus LOA";
  // the equals/shift lines are "Total Present" which subtracts today's
  // absentees, shrinking the denominator and inflating the %.
  const shiftSum = (n1, n2) => (n1 != null && n2 != null) ? n1 + n2 : null;
  const DL_total  = DL_colon  ?? shiftSum(DL_1st,  DL_2nd)  ?? DL_eq;
  const IDL_total = IDL_colon ?? shiftSum(IDL_1st, IDL_2nd) ?? IDL_eq;

  if (DL_total == null && IDL_total == null) return null;

  return { DL_1st, DL_2nd, IDL_1st, IDL_2nd, DL_total, IDL_total };
}
