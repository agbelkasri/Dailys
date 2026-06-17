/**
 * One-off cleanup for previously-imported Daily Reports.
 * ─────────────────────────────────────────────────────
 * The first version of the Excel importer wrapped every line in <p>…</p>
 * (including blank/whitespace-only lines as <p><br></p> / <p>   </p>),
 * which rendered with ugly paragraph gaps and — worse — collapsed onto a
 * single line when the absentee parser stripped the tags.
 *
 * This script re-cleans the `comments` on every section of every imported
 * report: HTML → plain text → tidy <br>-joined HTML (blank runs collapsed,
 * trailing whitespace trimmed). Only touches docs tagged importedFromExcel,
 * so hand-entered reports (which may carry intentional bold/red/highlight
 * formatting) are never altered.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT=$(cat key.json) node scripts/cleanImportedComments.js --dry-run
 *   FIREBASE_SERVICE_ACCOUNT=$(cat key.json) node scripts/cleanImportedComments.js
 *   ...                                                   node scripts/cleanImportedComments.js --plant EAP
 */

import { initializeApp, cert }      from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { cleanComment } from '../src/utils/parseHistoricalExcel.js';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT env var is not set.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const plantArg = (() => { const i = args.indexOf('--plant'); return i >= 0 ? args[i + 1]?.toUpperCase() : null; })();

console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}${plantArg ? `  ·  plant=${plantArg}` : ''}\n`);

// Every report the importer created is tagged importedFromExcel:true.
const snap = await db.collection('reports').where('importedFromExcel', '==', true).get();
console.log(`Found ${snap.size} imported report(s)\n`);

const stats = { reports: 0, sectionsChanged: 0, sectionsUnchanged: 0 };

for (const reportDoc of snap.docs) {
  const plantId = reportDoc.data().plantId || reportDoc.id.split('_')[0];
  if (plantArg && plantId !== plantArg) continue;

  const sectionsSnap = await db.collection(`reports/${reportDoc.id}/sections`).get();
  let changedHere = 0;
  const batch = db.batch();

  for (const sec of sectionsSnap.docs) {
    const data = sec.data();
    const before = data.comments;
    if (!before) continue;                  // nothing to clean
    const after = cleanComment(before, sec.id);
    if (after === before) { stats.sectionsUnchanged++; continue; }

    changedHere++;
    stats.sectionsChanged++;
    if (!dryRun) {
      batch.set(
        sec.ref,
        { comments: after, commentsCleanedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  }

  if (changedHere > 0) {
    stats.reports++;
    console.log(`${dryRun ? '[dry] ' : ''}${reportDoc.id}: ${changedHere} section(s) cleaned`);
    if (!dryRun) await batch.commit();
  }
}

console.log(`\n──────── Summary ────────`);
console.log(`Reports touched: ${stats.reports}`);
console.log(`Sections cleaned: ${stats.sectionsChanged}   unchanged: ${stats.sectionsUnchanged}`);
if (dryRun) console.log(`(dry-run — no writes made)`);
process.exit(0);
