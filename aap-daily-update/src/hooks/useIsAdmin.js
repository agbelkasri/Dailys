import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Returns true if the currently signed-in user is listed as an admin
 * in /config/admins (emails array).  Updates in real-time if the list changes.
 */
export function useIsAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setIsAdmin(false);
      return;
    }

    const email = user.email.toLowerCase();
    const ref = doc(db, 'config', 'admins');

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setIsAdmin(false); return; }
      const emails = (snap.data().emails || []).map(e => e.toLowerCase());
      setIsAdmin(emails.includes(email));
    });

    return unsub;
  }, [user?.email]);

  return isAdmin;
}
