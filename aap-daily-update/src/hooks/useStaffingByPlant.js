import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PLANTS } from '../constants/absences';

/**
 * Live snapshot of the `staffing-issues` section comment per plant for a
 * single date. Returns:
 *
 *   {
 *     byPlant: {
 *       EAP: { comments: '...', date: '2026-05-13' },
 *       GAP: { ... }, SLP: { ... },
 *     },
 *     loading: boolean,
 *   }
 *
 * When `plantFilter` is set we subscribe to only that plant. Stale entries
 * from a previous date are dropped in the render phase via a date check,
 * so the consumer never sees data from the wrong day during a transition.
 *
 * `loading` is true between the date changing and the first Firestore
 * snapshot for the new date arriving — gates UI like the "no headcount
 * yet" warning banner so it doesn't flash during day navigation.
 */
export function useStaffingByPlant(date, plantFilter) {
  const [byPlant, setByPlant] = useState({});

  useEffect(() => {
    if (!date) return;

    const plantIds = plantFilter
      ? [plantFilter]
      : PLANTS.map(p => p.id);

    const unsubs = plantIds.map(plantId => {
      const ref = doc(db, 'reports', `${plantId}_${date}`, 'sections', 'staffing-issues');
      return onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() || {};
          setByPlant(prev => ({
            ...prev,
            [plantId]: { date, comments: data.comments || '' },
          }));
        },
        (err) => {
          // Read failure is non-fatal but we still mark this plant as
          // "loaded" (empty entry) so loading resolves; otherwise the
          // hook would hang on `loading: true` forever for a missing
          // report doc.
          console.warn(`Staffing snapshot failed for ${plantId} ${date}:`, err);
          setByPlant(prev => ({
            ...prev,
            [plantId]: { date, comments: '' },
          }));
        }
      );
    });

    return () => unsubs.forEach(u => u());
  }, [date, plantFilter]);

  // Drop entries whose stored date doesn't match the current one — guards
  // against showing stale data while a new subscription is spinning up.
  const filtered = {};
  for (const [plantId, val] of Object.entries(byPlant)) {
    if (val.date === date) filtered[plantId] = val;
  }
  // Still loading until at least one plant snapshot has arrived for the
  // current date. The empty intermediate state (date changed, new
  // subscriptions not yet fired) is what causes the warning-banner flash.
  const loading = Object.keys(filtered).length === 0;
  return { byPlant: filtered, loading };
}
