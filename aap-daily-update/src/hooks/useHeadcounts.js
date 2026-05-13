import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Live snapshot of /headcounts (all plants).
 * Returns { headcounts, loading } where headcounts is a map keyed by
 * plantId, e.g.
 *
 *   {
 *     EAP: { DL_1st: 26, DL_2nd: 11, IDL_1st: 5, IDL_2nd: 2 },
 *     GAP: { ... },
 *     SLP: { ... },
 *   }
 *
 * Plants with no headcount doc yet are simply absent from the map; the
 * calling code should treat missing entries as "unknown" (denominator 0)
 * and render a "—" instead of dividing by zero.
 */
export function useHeadcounts() {
  const [state, setState] = useState({ headcounts: {}, loading: true });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'headcounts'),
      (snap) => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data(); });
        setState({ headcounts: map, loading: false });
      },
      (err) => {
        console.error('useHeadcounts error:', err);
        setState({ headcounts: {}, loading: false });
      }
    );
    return unsub;
  }, []);

  return state;
}
