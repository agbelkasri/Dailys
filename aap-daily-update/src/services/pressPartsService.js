import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const REF = () => doc(db, 'config', 'pressParts');

/** Save the full parts map for a plant. partsMap = { "WC001": ["p1","p2"], ... } */
export async function savePressParts(plantId, partsMap) {
  const snap = await getDoc(REF());
  const existing = snap.exists() ? snap.data() : {};
  await setDoc(REF(), { ...existing, [plantId]: partsMap });
}
