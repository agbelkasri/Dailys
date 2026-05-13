import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Writes (or merges) one plant's headcount into /headcounts/{plantId}.
 * Shape:
 *   {
 *     DL_1st:  number,   // direct-labor, 1st shift, full-time
 *     DL_2nd:  number,   // direct-labor, 2nd shift, full-time
 *     IDL_1st: number,   // indirect-labor, 1st shift
 *     IDL_2nd: number,
 *     updatedAt: <serverTimestamp>,
 *     updatedBy: string,
 *   }
 *
 * Gated to admins by firestore.rules — non-admin calls throw a
 * permission-denied error which the modal surfaces to the user.
 */
export async function setPlantHeadcount(plantId, counts) {
  const user = auth.currentUser;
  const ref = doc(db, 'headcounts', plantId);
  await setDoc(ref, {
    DL_1st:  Number(counts.DL_1st)  || 0,
    DL_2nd:  Number(counts.DL_2nd)  || 0,
    IDL_1st: Number(counts.IDL_1st) || 0,
    IDL_2nd: Number(counts.IDL_2nd) || 0,
    updatedAt: serverTimestamp(),
    updatedBy: user?.displayName || user?.email || 'unknown',
  }, { merge: true });
}

/** Sum of full-time direct-labor workers across both shifts. */
export function totalDirectLabor(plantHeadcount) {
  if (!plantHeadcount) return 0;
  return (plantHeadcount.DL_1st || 0) + (plantHeadcount.DL_2nd || 0);
}

/** Sum of indirect-labor workers across both shifts. */
export function totalIndirectLabor(plantHeadcount) {
  if (!plantHeadcount) return 0;
  return (plantHeadcount.IDL_1st || 0) + (plantHeadcount.IDL_2nd || 0);
}
