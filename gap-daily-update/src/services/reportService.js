import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

function getCurrentUser() {
  const user = auth.currentUser;
  return {
    uid: user?.uid || 'unknown',
    displayName: user?.displayName || user?.email || 'Unknown User',
    email: user?.email || '',
  };
}

async function writeAuditLog(date, sectionId, field, newValue, user) {
  try {
    const logRef = collection(db, 'reports', date, 'auditLog');
    await addDoc(logRef, {
      sectionId,
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

export async function updateSectionStatus(date, sectionId, status) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', date, 'sections', sectionId);
  await updateDoc(ref, {
    status,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  });
  await writeAuditLog(date, sectionId, 'status', status, user);
}

export async function updateSectionComments(date, sectionId, comments) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', date, 'sections', sectionId);
  await updateDoc(ref, {
    comments,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  });
  // Audit log for comments is intentionally omitted to avoid high write volume
  // The lastEditedBy + lastEditedAt fields serve as the lightweight audit trail for comments
}

export async function updateSubTableData(date, sectionId, subTableData) {
  const user = getCurrentUser();
  const ref = doc(db, 'reports', date, 'sections', sectionId);
  await updateDoc(ref, {
    subTableData,
    lastEditedBy: user.displayName,
    lastEditedAt: serverTimestamp(),
  });
  await writeAuditLog(date, sectionId, 'subTableData', subTableData, user);
}
