import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

function getCurrentUser() {
  const user = auth.currentUser;
  return {
    uid: user?.uid || 'unknown',
    displayName: user?.displayName || user?.email || 'Unknown User',
    email: user?.email || '',
  };
}

async function writeAuditLog(reportId, sectionId, field, newValue, user) {
  try {
    // Nested under the section so queries need no composite index
    const logRef = collection(db, 'reports', reportId, 'sections', sectionId, 'auditLog');
    await addDoc(logRef, {
      field,
      newValue,
      editedBy: user,
      editedAt: serverTimestamp(),
    });
  } catch (err) {
    // Audit log failure should not break the main update
    console.warn('Audit log write failed:', err);
  }
}

export async function updateSectionStatus(reportId, sectionId, status) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', reportId, 'sections', sectionId);
  await setDoc(ref, {
    status,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  }, { merge: true });
  await writeAuditLog(reportId, sectionId, 'status', status, user);
}

export async function updateSectionComments(reportId, sectionId, comments) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', reportId, 'sections', sectionId);
  await setDoc(ref, {
    comments,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  }, { merge: true });
  await writeAuditLog(reportId, sectionId, 'comments', comments, user);
}

export async function updateSubTableData(reportId, sectionId, subTableData) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', reportId, 'sections', sectionId);
  await setDoc(ref, {
    subTableData,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  }, { merge: true });
  await writeAuditLog(reportId, sectionId, 'subTableData', subTableData, user);
}

export async function toggleSectionCarryForward(reportId, sectionId, carryForward) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', reportId, 'sections', sectionId);
  await setDoc(ref, { carryForward }, { merge: true });
  await writeAuditLog(reportId, sectionId, 'carryForward', carryForward, user);
}
