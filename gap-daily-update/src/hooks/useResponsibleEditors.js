import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Live-subscribes to /config/sectionEditors and returns a map
 *   { responsibleParty: [emails (lowercased)] }
 *
 * The doc shape is intentionally simple — keys are the same strings used in
 * each section definition's `responsible` field (e.g. "Julius", "Nicole"),
 * values are arrays of email addresses. Example:
 *
 *   {
 *     "Julius": ["jgreen@eapllcorp.com"]
 *   }
 *
 * Editors granted here can edit sections owned by their responsible-party
 * for the current ISO week and the immediately-prior ISO week (see
 * isInCurrentOrPreviousISOWeek), even on days where the report is otherwise
 * read-only for non-admins. Admins are unaffected — they already edit any day.
 *
 * If the doc doesn't exist, returns an empty map and behavior is unchanged.
 */
export function useResponsibleEditors() {
  const [editorsByResponsible, setEditors] = useState({});

  useEffect(() => {
    const ref = doc(db, 'config', 'sectionEditors');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) { setEditors({}); return; }
        const raw = snap.data() || {};
        const normalized = {};
        for (const [responsible, emails] of Object.entries(raw)) {
          if (!Array.isArray(emails)) continue;
          normalized[responsible] = emails
            .filter((e) => typeof e === 'string')
            .map((e) => e.toLowerCase());
        }
        setEditors(normalized);
      },
      // On error (e.g. rules deny read), fall back to empty — never crash the app
      () => setEditors({})
    );
    return unsub;
  }, []);

  return editorsByResponsible;
}
