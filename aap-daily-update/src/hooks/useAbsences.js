import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export function useAbsences(date) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'absences'),
      where('date', '==', date),
      orderBy('employeeName')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useAbsences error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [date]);

  return { absences, loading, error };
}
