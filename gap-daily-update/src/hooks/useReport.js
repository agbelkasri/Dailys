import { useEffect, useState } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SECTIONS } from '../constants/sections';
import { getTodayDate } from './useDateNavigation';

// Client-side fallback: create today's report if Cloud Function hasn't run yet
async function ensureTodayReportExists(date) {
  const reportRef = doc(db, 'reports', date);

  try {
    // Use setDoc with merge:true so if it already exists nothing is overwritten
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

    const batch = writeBatch(db);
    for (const section of SECTIONS) {
      const sectionRef = doc(db, 'reports', date, 'sections', section.id);
      batch.set(
        sectionRef,
        {
          sectionId: section.id,
          sectionType: section.sectionType,
          responsible: section.responsible,
          measurable: section.measurable,
          sortOrder: section.sortOrder,
          status: '',
          comments: '',
          subTableData: [],
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

export function useReport(date) {
  const [report, setReport] = useState(null);
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    setError(null);

    const reportRef = doc(db, 'reports', date);
    const sectionsRef = collection(db, 'reports', date, 'sections');
    const sectionsQuery = query(sectionsRef, orderBy('sortOrder'));

    const unsubReport = onSnapshot(
      reportRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setReport(data);

        // If this is today and no report exists yet, create it
        if (!snap.exists() && date === getTodayDate()) {
          ensureTodayReportExists(date);
        }
      },
      (err) => {
        console.error('Report snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubSections = onSnapshot(
      sectionsQuery,
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
  }, [date]);

  return { report, sections, loading, error };
}
