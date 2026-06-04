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

import { parseWorkbook } from '../src/utils/parseHistoricalExcel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase ─────────────────────────────────────────────────────────────────
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT env var is not set.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

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

// ── Firestore writer (admin-SDK variant) ─────────────────────────────────────

async function writeReport(plantId, date, sections) {
  const reportId  = `${plantId}_${date}`;
  const reportRef = db.doc(`reports/${reportId}`);

  const existing = await reportRef.get();
  if (existing.exists && !opts.overwrite) return { skipped: 'exists' };
  if (opts.dryRun) return { dryRun: true, sectionCount: Object.keys(sections).length };

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
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(join(opts.dir, file));
  } catch (err) {
    console.error(`✗ Failed to open ${file}: ${err.message}`);
    stats.errors++;
    continue;
  }

  const days = parseWorkbook(wb, file);
  if (days.length === 0) {
    console.log(`⚠ Skip ${file} — unrecognized filename or no day-sheets found`);
    stats.errors++;
    continue;
  }

  if (opts.plant) {
    const filtered = days.filter(d => d.plant === opts.plant.toUpperCase());
    if (filtered.length === 0) continue;
    days.length = 0; days.push(...filtered);
  }

  console.log(`📄 ${file} → ${days[0].plant} (${days.length} day-sheet${days.length !== 1 ? 's' : ''})`);

  for (const { plant, date, sheetName, sections } of days) {
    const res = await writeReport(plant, date, sections);
    logResult(`${sheetName} (${date})`, sections, res);
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
