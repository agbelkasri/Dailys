// Quick diagnostic: test Firestore read as an authenticated user
// Run with: node test-db.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBUBq8q-VC6bDCpTlLFuYNDpXAtL_ABbS4',
  authDomain: 'dailys-aap.firebaseapp.com',
  projectId: 'dailys-aap',
  storageBucket: 'dailys-aap.firebasestorage.app',
  messagingSenderId: '681237206681',
  appId: '1:681237206681:web:2cb753d98e6323a775ca08',
  databaseURL: 'https://dailys-aap-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd

console.log('=== Firestore Diagnostic ===');
console.log('Today date key:', today);

try {
  console.log('\n1. Signing in as demo@aapincorp.com ...');
  const cred = await signInWithEmailAndPassword(auth, 'demo@aapincorp.com', 'GapDemo2024!');
  console.log('   ✓ Signed in as', cred.user.email, '| uid:', cred.user.uid);

  console.log('\n2. Reading reports/' + today + ' ...');
  const reportRef = doc(db, 'reports', today);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    console.log('   ✓ Report doc exists:', JSON.stringify(reportSnap.data(), null, 2));
  } else {
    console.log('   ⚠ Report doc does NOT exist for today — app will try to create it');
  }

  console.log('\n3. Reading reports/' + today + '/sections ...');
  const sectionsRef = collection(db, 'reports', today, 'sections');
  const sectionsSnap = await getDocs(sectionsRef);
  console.log('   Sections found:', sectionsSnap.size);
  sectionsSnap.forEach(d => console.log('   -', d.id, '| status:', d.data().status));

} catch (err) {
  console.error('\n❌ ERROR:', err.code, '-', err.message);
}

process.exit(0);
