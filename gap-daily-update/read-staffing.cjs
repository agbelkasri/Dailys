const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyBUBq8q-VC6bDCpTlLFuYNDpXAtL_ABbS4',
  authDomain: 'dailys-aap.firebaseapp.com',
  projectId: 'dailys-aap',
});
const db = getFirestore(app);

async function main() {
  const plants = ['GAP', 'EAP', 'SLP'];
  // Try last 10 days
  const dates = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date('2026-04-25T12:00:00');
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  for (const plant of plants) {
    for (const date of dates) {
      const reportId = `${plant}_${date}`;
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const ref = doc(db, 'reports', reportId, 'sections', 'staffing-issues');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.comments && data.comments.trim()) {
            console.log(`\n=== ${plant} ${date} ===`);
            console.log(data.comments);
          }
        }
      } catch(e) {}
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
