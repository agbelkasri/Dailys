import { useEffect, useState } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getSectionsForPlant } from '../constants/sections';
import { getTodayDate } from './useDateNavigation';

// Walk back up to 14 calendar days to find the most recent report that has data.
// Returns { sections: {[sectionId]: data}, sourceDate } or null.
async function findCarryForwardSource(plantId, beforeDate) {
  const base = new Date(beforeDate + 'T12:00:00');
  for (let i = 1; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const prevDate = d.toISOString().split('T')[0];
    const prevReportId = `${plantId}_${prevDate}`;
    try {
      const snap = await getDocs(collection(db, 'reports', prevReportId, 'sections'));
      if (snap.size === 0) continue;
      const hasData = snap.docs.some(doc => {
        const s = doc.data();
        return s.status || s.comments || s.subTableData?.length > 0;
      });
      if (!hasData) continue;
      const sections = {};
      snap.docs.forEach(doc => { sections[doc.id] = doc.data(); });
      return { sections, sourceDate: prevDate };
    } catch {
      // Report doesn't exist or can't be read — try further back
    }
  }
  return null;
}

// Client-side fallback: create today's report if Cloud Function hasn't run yet.
// Carries forward section data from the most recent previous report so supervisors
// don't have to re-enter information that rarely changes.
async function ensureTodayReportExists(reportId, date, plantId) {
  const reportRef = doc(db, 'reports', reportId);

  try {
    await setDoc(
      reportRef,
      {
        createdAt: serverTimestamp(),
        emailSentAt: null,
        lockedAt: null,
        reportDate: date,
      },
      { merge: true }
    );

    const previous = await findCarryForwardSource(plantId, date);

    const batch = writeBatch(db);
    for (const section of getSectionsForPlant(plantId)) {
      const sectionRef = doc(db, 'reports', reportId, 'sections', section.id);
      const prev = previous?.sections[section.id];
      // carryForward defaults to true; only skip data when explicitly false
      const shouldCarry = prev?.carryForward !== false;
      batch.set(
        sectionRef,
        {
          sectionId:    section.id,
          sectionType:  section.sectionType,
          responsible:  section.responsible,
          measurable:   section.measurable,
          sortOrder:    section.sortOrder,
          status:       shouldCarry ? (prev?.status       ?? '') : '',
          comments:     shouldCarry ? (prev?.comments     ?? '') : '',
          subTableData: shouldCarry ? (prev?.subTableData ?? []) : [],
          carryForward: prev?.carryForward ?? true,  // always propagate the setting itself
          lastEditedBy: null,
          lastEditedAt: null,
        },
        { merge: true }
      );
    }
    await batch.commit();
  } catch (err) {
    console.error('Failed to ensure report exists:', err);
  }
}

export function useReport(date, plantId) {
  const [report, setReport] = useState(null);
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date || !plantId) return;

    const reportId = `${plantId}_${date}`;

    setLoading(true);
    setError(null);

    const reportRef = doc(db, 'reports', reportId);
    const sectionsRef = collection(db, 'reports', reportId, 'sections');
    // No orderBy — Firestore excludes docs missing the sorted field, which breaks
    // newly-created section docs that only have partial data. Client-side ordering
    // comes from getSectionsForPlant() in DailyReport, so server ordering is unused.

    const unsubReport = onSnapshot(
      reportRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setReport(data);

        // If this is today and no report exists yet, create it (with carry-forward)
        if (!snap.exists() && date === getTodayDate()) {
          ensureTodayReportExists(reportId, date, plantId);
        }
      },
      (err) => {
        console.error('Report snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubSections = onSnapshot(
      sectionsRef,
      (snap) => {
        const sectionsMap = {};
        snap.docs.forEach((d) => {
          sectionsMap[d.id] = d.data();
        });
        setSections(sectionsMap);
        setLoading(false);
      },
      (err) => {
        console.error('Sections snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubReport();
      unsubSections();
    };
  }, [date, plantId]);

  return { report, sections, loading, error };
}
