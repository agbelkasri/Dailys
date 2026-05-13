import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PLANTS } from '../constants/absences';

/**
 * Live snapshot of the `staffing-issues` section comment per plant for a
 * single date. Returns a map keyed by plantId:
 *
 *   { EAP: { comments: '...', date: '2026-05-13' },
 *     GAP: { ... },
 *     SLP: { ... } }
 *
 * When `plantFilter` is set we subscribe to only that plant. Stale entries
 * from a previous date are dropped in the render phase via a date check,
 * so the consumer never sees data from the wrong day during a transition.
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
          // Read failure (e.g. report doc doesn't exist yet) is non-fatal —
          // the consumer treats a missing entry as "no staffing data yet".
          console.warn(`Staffing snapshot failed for ${plantId} ${date}:`, err);
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
  return filtered;
}
