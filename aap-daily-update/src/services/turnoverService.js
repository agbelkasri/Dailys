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

export async function addTurnover(data) {
  const user = getCurrentUser();
  return addDoc(collection(db, 'turnovers'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByName: user.displayName,
    updatedByName: user.displayName,
  });
}

export async function updateTurnover(id, changes) {
  const user = getCurrentUser();
  return updateDoc(doc(db, 'turnovers', id), {
    ...changes,
    updatedAt: serverTimestamp(),
    updatedByName: user.displayName,
  });
}

export async function deleteTurnover(id) {
  return deleteDoc(doc(db, 'turnovers', id));
}
