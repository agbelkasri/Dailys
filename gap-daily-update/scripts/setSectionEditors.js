/**
 * One-shot admin script to seed/update /config/sectionEditors.
 *
 * /config is locked down by Firestore rules (allow write: if false), so this
 * script must run with the Firebase Admin SDK using a service-account key.
 *
 * Schema: a single document at config/sectionEditors with the shape
 *
 *   {
 *     "<Responsible Party Name>": ["email1@example.com", "email2@example.com"]
 *   }
 *
 * The keys MUST match the `responsible` strings in src/constants/sections.js
 * exactly (case-sensitive). Each listed editor gets edit access to every
 * section across all plants whose `responsible` field matches the key, for
 * the current ISO week and the previous ISO week (rolling).
 *
 * Run:
 *   FIREBASE_SERVICE_ACCOUNT='<json blob>' node scripts/setSectionEditors.js
 *
 * The script uses set with merge so adding/removing an editor is non-destructive
 * to other responsible-party entries.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';

// Edit this map to add / remove editors. Keys are responsible-party names as
// they appear in src/constants/sections.js.
const EDITORS = {
  Julius: ['jgreen@eapllcorp.com'],
};

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  console.error('Set it to the full contents of your Firebase service-account JSON key.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

(async () => {
  const ref = db.doc('config/sectionEditors');
  await ref.set(EDITORS, { merge: true });

  const snap = await ref.get();
  console.log('✓ /config/sectionEditors updated. Current contents:');
  console.log(JSON.stringify(snap.data(), null, 2));
})().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
