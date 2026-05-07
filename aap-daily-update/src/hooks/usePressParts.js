import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Returns the press→parts map for a given plant, plus a loading flag.
 * Data shape: { "WC001": ["part1", "part2"], "WC002": ["part3"] }
 */
export function usePressParts(plantId) {
  const [partsMap, setPartsMap] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!plantId) return;
    const ref = doc(db, 'config', 'pressParts');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      setPartsMap(data[plantId] || {});
      setLoading(false);
    }, (err) => {
      console.error('usePressParts error:', err);
      setLoading(false);
    });
    return unsub;
  }, [plantId]);

  return { partsMap, loading };
}
