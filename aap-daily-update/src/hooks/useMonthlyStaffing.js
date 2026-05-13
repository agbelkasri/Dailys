import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PLANTS } from '../constants/absences';

/**
 * Subscribes to the staffing-issues section comment for every weekday in
 * the given month, for each plant in scope. Returns:
 *
 *   {
 *     byKey: { '<plantId>_<YYYY-MM-DD>': { plantId, date, comments } },
 *     loading: boolean,
 *   }
 *
 * The Monthly View aggregates these into person-day percentages:
 *   monthly absenteeism % = Σ(daily DL absences) / Σ(daily DL headcounts)
 *
 * Heavy: ~22 weekdays × N plants = up to 66 active subscriptions for
 * "All Plants". That's fine for a monthly dashboard but should not be
 * used on a tight loop. Stale entries from a previous (year, month,
 * plantFilter) selection are dropped in the render phase via a subKey
 * check so swapping months doesn't briefly show last month's data.
 */
export function useMonthlyStaffing(year, month, plantFilter) {
  const [byKey, setByKey] = useState({});

  useEffect(() => {
    if (year == null || month == null) return;

    const plantIds = plantFilter ? [plantFilter] : PLANTS.map(p => p.id);
    const subKey = `${year}-${month}__${plantFilter || 'all'}`;

    // Enumerate every weekday in the month (skip Sat/Sun)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    const mm = String(month + 1).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) continue;
      dates.push(`${year}-${mm}-${String(d).padStart(2, '0')}`);
    }

    const unsubs = [];
    for (const plantId of plantIds) {
      for (const date of dates) {
        const ref = doc(db, 'reports', `${plantId}_${date}`, 'sections', 'staffing-issues');
        unsubs.push(onSnapshot(
          ref,
          (snap) => {
            const data = snap.data() || {};
            setByKey(prev => ({
              ...prev,
              [`${plantId}_${date}`]: {
                plantId, date, comments: data.comments || '', subKey,
              },
            }));
          },
          (err) => {
            // Most "errors" here are just "doc doesn't exist" — non-fatal,
            // but still seed an empty entry so loading resolves.
            console.warn(`Monthly staffing failed for ${plantId} ${date}:`, err);
            setByKey(prev => ({
              ...prev,
              [`${plantId}_${date}`]: { plantId, date, comments: '', subKey },
            }));
          }
        ));
      }
    }

    return () => unsubs.forEach(u => u());
  }, [year, month, plantFilter]);

  // Drop entries that don't match the current selection so swapping
  // months / plants doesn't briefly mix data sets.
  const currentSubKey = `${year}-${month}__${plantFilter || 'all'}`;
  const filtered = {};
  for (const [k, v] of Object.entries(byKey)) {
    if (v.subKey === currentSubKey) filtered[k] = v;
  }
  const loading = Object.keys(filtered).length === 0;
  return { byKey: filtered, loading };
}
