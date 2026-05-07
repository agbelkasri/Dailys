import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useAuditLog(reportId, sectionId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId || !sectionId) return;

    setLoading(true);

    const logRef = collection(db, 'reports', reportId, 'sections', sectionId, 'auditLog');
    const q = query(logRef, orderBy('editedAt', 'desc'), limit(50));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Audit log fetch error:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [reportId, sectionId]);

  return { entries, loading };
}
