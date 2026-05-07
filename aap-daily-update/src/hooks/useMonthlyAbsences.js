import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export function useMonthlyAbsences(year, month) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (year == null || month == null) return;

    setLoading(true);
    setError(null);

    const mm = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${mm}-01`;
    const endDate   = `${year}-${mm}-31`; // Firestore string compare handles short months fine

    const q = query(
      collection(db, 'absences'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useMonthlyAbsences error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [year, month]);

  return { absences, loading, error };
}
