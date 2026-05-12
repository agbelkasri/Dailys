import { useEffect, useRef, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Live-subscribes to every absence document whose `date` string falls in
 * [startDate, endDate] inclusive. Dates are 'YYYY-MM-DD' strings (Firestore
 * string-compare is lexicographic, which works correctly for ISO dates).
 *
 * Use this when you need a multi-month aggregate (e.g. a 6-month trend on
 * the executive overview) — it issues a single range query instead of six
 * useMonthlyAbsences hooks.
 *
 * State is updated only from the snapshot callback (no synchronous setState
 * in the effect body) and a ref-based guard discards late results from a
 * previous subscription when the range changes mid-flight.
 */
export function useAbsencesInRange(startDate, endDate) {
  const [state, setState] = useState({ absences: [], loading: true, error: null });
  const activeKeyRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      activeKeyRef.current = null;
      return;
    }

    const key = `${startDate}__${endDate}`;
    activeKeyRef.current = key;

    const q = query(
      collection(db, 'absences'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Drop results from a subscription that's been superseded by a
        // newer range — prevents older data overwriting newer state.
        if (activeKeyRef.current !== key) return;
        setState({
          absences: snap.docs.map(d => ({ id: d.id, ...d.data() })),
          loading:  false,
          error:    null,
        });
      },
      (err) => {
        if (activeKeyRef.current !== key) return;
        console.error('useAbsencesInRange error:', err);
        setState({ absences: [], loading: false, error: err.message });
      }
    );

    return unsub;
  }, [startDate, endDate]);

  return state;
}
