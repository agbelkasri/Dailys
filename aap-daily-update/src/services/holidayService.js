import {
  doc, setDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Mark or unmark a single (plant, date) as a holiday in /config/holidays.
 *
 * Admin-only — Firestore rules reject the write for non-admins. The UI
 * also hides the toggle from non-admins, but the rule is the real guard.
 *
 * @param {'EAP'|'GAP'|'SLP'} plant
 * @param {string}  date    YYYY-MM-DD
 * @param {boolean} value   true → mark holiday, false → clear it
 */
export async function setHoliday(plant, date, value) {
  const ref = doc(db, 'config', 'holidays');
  await setDoc(
    ref,
    { [plant]: value ? arrayUnion(date) : arrayRemove(date) },
    { merge: true }
  );
}
