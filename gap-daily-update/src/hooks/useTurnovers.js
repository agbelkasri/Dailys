import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export function useTurnovers(date) {
  const [turnovers, setTurnovers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'turnovers'),
      where('lastDay', '==', date),
      orderBy('employeeName')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTurnovers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useTurnovers error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [date]);

  return { turnovers, loading, error };
}
