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

/**
 * Logs a change request against a historical (read-only) report. Today this
 * always writes status='auto-approved' since auto-approval is universal,
 * but the document shape is ready for a future approval workflow:
 *
 *   {
 *     requestedBy:   { uid, displayName, email },
 *     requestedAt:   <serverTimestamp>,
 *     status:        'auto-approved' | 'pending' | 'approved' | 'rejected',
 *     approvalMode:  'auto' | 'manual',
 *     // populated later when manual approval is added:
 *     approvedBy?:   { uid, displayName, email },
 *     approvedAt?:   <timestamp>,
 *     rejectedReason?: string,
 *   }
 *
 * Section-level edits made during the request window are still captured in
 * the per-section auditLog, so this doc is just the higher-level edit-
 * session envelope. Throws on write failure so callers can show an error.
 */
export async function submitChangeRequest(reportId) {
  const user = getCurrentUser();
  const approvalMode = getApprovalModeForUser(user);
  const status = approvalMode === 'auto' ? 'auto-approved' : 'pending';
  const ref = collection(db, 'reports', reportId, 'changeRequests');
  await addDoc(ref, {
    requestedBy:  user,
    requestedAt:  serverTimestamp(),
    status,
    approvalMode,
  });
}

/**
 * Returns the approval mode for a given user. Today everyone is on 'auto'.
 * In the future this should consult something like /config/changeRequestPolicy
 * with the shape:
 *
 *   {
 *     autoApproveEmails: ['someone@x', ...],   // bypass — auto-approve
 *     defaultMode: 'manual'                     // everyone else needs approval
 *   }
 *
 * Returning 'auto' here keeps the change-request button working end-to-end
 * without forcing an admin approval queue UI to exist yet.
 */
function getApprovalModeForUser(/* user */) {
  return 'auto';
}
