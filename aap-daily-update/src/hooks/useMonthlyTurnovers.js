import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export function useMonthlyTurnovers(year, month) {
  const [turnovers, setTurnovers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (year == null || month == null) return;

    setLoading(true);
    setError(null);

    const mm = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${mm}-01`;
    const endDate   = `${year}-${mm}-31`;

    const q = query(
      collection(db, 'turnovers'),
      where('lastDay', '>=', startDate),
      where('lastDay', '<=', endDate),
      orderBy('lastDay')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTurnovers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useMonthlyTurnovers error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [year, month]);

  return { turnovers, loading, error };
}
