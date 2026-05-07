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
  const name  = nameWords.join(' ') || raw.trim();
  const notes = words.slice(nameWords.length).join(' ');
  return { name, notes };
}

/** Strip HTML tags / entities so rich-text carry-forward doesn't break parsing. */
function stripHtml(str) {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
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
