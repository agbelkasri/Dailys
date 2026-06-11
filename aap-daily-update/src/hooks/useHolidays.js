import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { EMPTY_HOLIDAYS } from '../utils/holidays';

/**
 * Live subscription to /config/holidays — the per-plant list of closed days.
 *
 * Returns { EAP: string[], GAP: string[], SLP: string[] } of YYYY-MM-DD
 * dates. Read by every absenteeism aggregation (Daily / Monthly / YTD) and
 * by the Daily Report to gate the admin holiday toggle and the non-admin
 * "plant closed" state.
 *
 * Same real-time pattern as useIsAdmin — toggling a holiday from one admin's
 * screen updates everyone else's views within a second, no refresh.
 */
export function useHolidays() {
  const [holidays, setHolidays] = useState(EMPTY_HOLIDAYS);

  useEffect(() => {
    const ref = doc(db, 'config', 'holidays');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const d = snap.exists() ? snap.data() : {};
        setHolidays({
          EAP: d.EAP || [],
          GAP: d.GAP || [],
          SLP: d.SLP || [],
        });
      },
      (err) => {
        console.error('useHolidays snapshot error:', err);
        setHolidays(EMPTY_HOLIDAYS);
      }
    );
    return unsub;
  }, []);

  return holidays;
}
