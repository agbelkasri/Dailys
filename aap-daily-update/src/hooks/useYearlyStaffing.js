import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PLANTS } from '../constants/absences';

/**
 * Year-to-Date staffing data. Fetches every weekday's staffing-issues
 * section once via parallel getDoc calls (no onSnapshot — YTD numbers
 * change slowly enough that we don't need a live feed, and ~250 active
 * snapshots × 3 plants would be excessive). Returns:
 *
 *   {
 *     byKey:    { '<plantId>_<YYYY-MM-DD>': { plantId, date, comments } },
 *     loading:  boolean,
 *     endDate:  'YYYY-MM-DD',   // last day included (today, or Dec 31 for past years)
 *     dayCount: number,         // total weekdays in range × plants in scope
 *   }
 *
 * For the current year, the range ends at today (true YTD). For past
 * years it spans the full calendar year. Stale data from a previous
 * (year, plantFilter) selection is dropped via a subKey check.
 */
export function useYearlyStaffing(year, plantFilter) {
  const [state, setState] = useState({ byKey: {}, subKey: null, endDate: null, dayCount: 0 });

  useEffect(() => {
    if (year == null) return;

    const plantIds = plantFilter ? [plantFilter] : PLANTS.map(p => p.id);
    const subKey = `${year}__${plantFilter || 'all'}`;

    // Date range: Jan 1 → today (current year) or Dec 31 (past years).
    // Future years aren't reachable from any UI today; if a year-nav
    // control is added later, gate it at <= current year there.
    const today = new Date();
    const endDate = year === today.getFullYear()
      ? formatISO(today)
      : `${year}-12-31`;

    const dates = enumerateWeekdays(`${year}-01-01`, endDate);
    let cancelled = false;

    (async () => {
      const promises = [];
      for (const plantId of plantIds) {
        for (const date of dates) {
          const ref = doc(db, 'reports', `${plantId}_${date}`, 'sections', 'staffing-issues');
          promises.push(
            getDoc(ref)
              .then(snap => ({
                key:      `${plantId}_${date}`,
                plantId, date,
                comments: snap.exists() ? (snap.data().comments || '') : '',
              }))
              .catch(() => ({ key: `${plantId}_${date}`, plantId, date, comments: '' }))
          );
        }
      }
      const results = await Promise.all(promises);
      if (cancelled) return;
      const byKey = {};
      for (const r of results) {
        byKey[r.key] = { plantId: r.plantId, date: r.date, comments: r.comments };
      }
      setState({ byKey, subKey, endDate, dayCount: promises.length });
    })();

    return () => { cancelled = true; };
  }, [year, plantFilter]);

  const expectedSubKey = `${year}__${plantFilter || 'all'}`;
  const matches = state.subKey === expectedSubKey;
  return {
    byKey:    matches ? state.byKey : {},
    loading:  !matches,
    endDate:  matches ? state.endDate : null,
    dayCount: matches ? state.dayCount : 0,
  };
}

/** ISO date in local time (avoids the UTC shift that toISOString() applies) */
function formatISO(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** All Mon–Fri dates between startISO and endISO inclusive, as YYYY-MM-DD strings. */
function enumerateWeekdays(startISO, endISO) {
  const out = [];
  const cur = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO   + 'T12:00:00');
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) out.push(formatISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
