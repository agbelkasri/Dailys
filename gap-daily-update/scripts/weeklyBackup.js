/**
 * Weekly Excel backup script
 * ──────────────────────────
 * Reads the previous 7 days of Daily reports from Firestore for all three
 * plants (GAP, EAP, SLP) and writes one .xlsx file per plant/day into
 *   backups/YYYY-Www/
 *
 * Run automatically every Monday by GitHub Actions.
 * Can also be triggered manually: node scripts/weeklyBackup.js
 *
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT  – full contents of a Firebase service-account JSON key
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }         from 'firebase-admin/firestore';
import * as XLSX                from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname }        from 'path';
import { fileURLToPath }        from 'url';

import { getSectionsForPlant, SECTION_TYPES } from '../src/constants/sections.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const PLANTS    = ['GAP', 'EAP', 'SLP'];

// ── Firebase ─────────────────────────────────────────────────────────────────

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  console.error('Set it to the full contents of your Firebase service-account JSON key.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Date → "YYYY-MM-DD" */
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Returns the 7 dates to back up.
 * When the script runs on Monday it covers the previous Mon – Sun.
 */
function getBackupDates() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 - i));
    return toDateStr(d);
  });
}

/** ISO week label from any date string, e.g. "2026-W17" */
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

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Strip HTML tags from rich-text fields so Excel shows plain text. */
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function formatSubTable(sectionType, rows) {
  if (!rows?.length) return '';
  switch (sectionType) {
    case SECTION_TYPES.CUSTOMER_INVENTORY:
      return rows.map(r =>
        `${r.customer} | ${r.programNumber} | ${r.partsSupplied} | ${r.coverageNotes}`
      ).join('\n');
    case SECTION_TYPES.DOWNTIME:
      return rows.map(r => `${r.reason}: ${r.percentage}`).join('\n');
    case SECTION_TYPES.QUALITY:
      return rows.map(r =>
        `${r.workcenterCode} | ${r.partNumber} | ${r.statusNotes}`
      ).join('\n');
    default:
      return '';
  }
}

// ── Firestore fetch ───────────────────────────────────────────────────────────

/**
 * Returns a map of { sectionId: sectionData } or null if no report exists.
 */
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

// ── Excel builder ─────────────────────────────────────────────────────────────

function buildWorkbook(plantId, date, sectionsData) {
  const sections = getSectionsForPlant(plantId);

  const rows = [
    [`${plantId} Daily Update`, '', '', ''],
    [`Report Date: ${date}`,    '', '', ''],
    [''],
    ['Responsible Party', 'Measurable', 'Status G/Y/R', 'Comments / Explanation'],
  ];

  for (const sec of sections) {
    const d       = sectionsData[sec.id] || {};
    const content = sec.sectionType === SECTION_TYPES.NORMAL
      ? stripHtml(d.comments || '')
      : formatSubTable(sec.sectionType, d.subTableData);

    rows.push([sec.responsible, sec.measurable, d.status || '', content]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 60 }];

  // Wrap text in the Comments column
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = 4; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell) {
      if (!cell.s) cell.s = {};
      cell.s.alignment = { wrapText: true, vertical: 'top' };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Daily Update ${date}`);
  return wb;
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

  let saved   = 0;
  let skipped = 0;

  for (const plantId of PLANTS) {
    for (const date of dates) {
      const sectionsData = await fetchReport(plantId, date);

      if (!sectionsData) {
        console.log(`  --  ${plantId}  ${date}  (no data)`);
        skipped++;
        continue;
      }

      const wb       = buildWorkbook(plantId, date, sectionsData);
      const filename = `${plantId}-Daily-Update-${date}.xlsx`;
      XLSX.writeFile(wb, join(outDir, filename));
      console.log(`  ✓   ${plantId}  ${date}  →  ${filename}`);
      saved++;
    }
  }

  console.log(`\n${saved} file(s) saved, ${skipped} skipped (no data).`);
}

main().catch(err => {
  console.error('\nBackup failed:', err);
  process.exit(1);
});
