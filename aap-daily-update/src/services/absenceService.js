import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function getCurrentUser() {
  const user = auth.currentUser;
  return {
    uid: user?.uid || 'unknown',
    displayName: user?.displayName || user?.email || 'Unknown User',
  };
}

export async function addAbsence(absenceData) {
  const user = getCurrentUser();
  return addDoc(collection(db, 'absences'), {
    ...absenceData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByName: user.displayName,
    updatedByName: user.displayName,
  });
}

export async function updateAbsence(id, changes) {
  const user = getCurrentUser();
  return updateDoc(doc(db, 'absences', id), {
    ...changes,
    updatedAt: serverTimestamp(),
    updatedByName: user.displayName,
  });
}

export async function deleteAbsence(id) {
  return deleteDoc(doc(db, 'absences', id));
}
