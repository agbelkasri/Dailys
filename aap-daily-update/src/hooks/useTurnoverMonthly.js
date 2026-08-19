import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Live monthly turnover rows for one plant + year.
 *
 * Returns { rows, loading, error } where rows is sorted ascending by month:
 *   [{ id, plantId, month: "YYYY-MM", year, salary:{headcount,terminations}, direct:{…}, indirect:{…} }]
 *
 * Queries only on `plantId` (a single-field index Firestore maintains
 * automatically) and filters the year client-side, so no composite index is
 * needed. Volume is tiny (≤12 docs per plant-year).
 */
export function useTurnoverMonthly(plantId, year) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plantId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const q = query(collection(db, 'turnoverMonthly'), where('plantId', '==', plantId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const yr = String(year);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => (r.year || String(r.month || '').slice(0, 4)) === yr)
          .sort((a, b) => String(a.month).localeCompare(String(b.month)));
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error('useTurnoverMonthly snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [plantId, year]);

  return { rows, loading, error };
}

/** Live Dec-2025 baseline headcounts for one plant, or null. */
export function useTurnoverBaseline(plantId) {
  const [baseline, setBaseline] = useState(null);

  useEffect(() => {
    if (!plantId) { setBaseline(null); return; }
    const unsub = onSnapshot(
      doc(db, 'turnoverBaseline', plantId),
      (snap) => setBaseline(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => { console.error('useTurnoverBaseline snapshot error:', err); setBaseline(null); }
    );
    return unsub;
  }, [plantId]);

  return baseline;
}
