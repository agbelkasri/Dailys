import { useEffect, useState, useCallback } from 'react';
import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { rtdb } from '../firebase';

export function usePresence(date, user) {
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    if (!user) return;

    const myPresenceRef = ref(rtdb, `presence/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Write my presence
        set(myPresenceRef, {
          uid: user.uid,
          displayName: user.displayName || user.email,
          photoURL: user.photoURL || null,
          currentDate: date,
          currentSection: null,
          lastSeen: serverTimestamp(),
          online: true,
        });

        // Clean up on disconnect
        onDisconnect(myPresenceRef).update({ online: false });
      }
    });

    // Subscribe to all presence records
    const allPresenceRef = ref(rtdb, 'presence');
    const unsubPresence = onValue(allPresenceRef, (snap) => {
      const data = snap.val() || {};
      setPresenceMap(data);
    });

    return () => {
      unsubConnected();
      unsubPresence();
      // Mark offline on cleanup
      update(myPresenceRef, { online: false });
    };
  }, [user, date]);

  // Update which section the user is currently editing
  const setActiveSection = useCallback(
    (sectionId) => {
      if (!user) return;
      const myPresenceRef = ref(rtdb, `presence/${user.uid}`);
      update(myPresenceRef, { currentSection: sectionId });
    },
    [user]
  );

  const clearActiveSection = useCallback(() => {
    if (!user) return;
    const myPresenceRef = ref(rtdb, `presence/${user.uid}`);
    update(myPresenceRef, { currentSection: null });
  }, [user]);

  // Users online on the current date (excluding self)
  const onlineUsers = Object.values(presenceMap).filter(
    (p) => p.online && p.currentDate === date && p.uid !== user?.uid
  );

  return { presenceMap, onlineUsers, setActiveSection, clearActiveSection };
}
