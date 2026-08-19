import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CATEGORY_IDS, emptyCategoryMap } from '../constants/turnoverMonthly';

function currentName() {
  const u = auth.currentUser;
  return u?.displayName || u?.email || 'Unknown User';
}

export function monthlyDocId(plantId, month) {
  return `${plantId}_${month}`;                 // e.g. "EAP_2026-01"
}

// Group flat parsed monthly rows into per-(plant, month) documents.
//   [{ id, plantId, month, year, salary:{headcount,terminations}, direct:{…}, indirect:{…} }]
export function groupMonthlyRows(rows) {
  const byDoc = new Map();
  for (const r of rows) {
    const id = monthlyDocId(r.plantId, r.month);
    if (!byDoc.has(id)) {
      byDoc.set(id, {
        id,
        plantId: r.plantId,
        month: r.month,
        year: r.month.slice(0, 4),
        ...emptyCategoryMap(),
      });
    }
    if (CATEGORY_IDS.includes(r.category)) {
      byDoc.get(id)[r.category] = {
        headcount: r.headcount,
        terminations: r.terminations,
      };
    }
  }
  return [...byDoc.values()].sort(
    (a, b) => a.month.localeCompare(b.month) || a.plantId.localeCompare(b.plantId)
  );
}

// Group flat baseline rows into per-plant documents.
//   [{ id, plantId, salary, direct, indirect }]  (headcount numbers)
export function groupBaselineRows(rows) {
  const byPlant = new Map();
  for (const r of rows) {
    if (!byPlant.has(r.plantId)) {
      byPlant.set(r.plantId, { id: r.plantId, plantId: r.plantId, salary: 0, direct: 0, indirect: 0 });
    }
    if (CATEGORY_IDS.includes(r.category)) byPlant.get(r.plantId)[r.category] = r.headcount;
  }
  return [...byPlant.values()];
}

function monthlyPayload(d) {
  return {
    plantId: d.plantId,
    month: d.month,
    year: d.year,
    salary: d.salary,
    direct: d.direct,
    indirect: d.indirect,
  };
}

function baselinePayload(d) {
  return { plantId: d.plantId, asOf: '2025-12', salary: d.salary, direct: d.direct, indirect: d.indirect };
}

// Batch-write monthly + baseline docs (merge). Firestore caps a batch at 500
// writes, so we chunk. Uses the signed-in admin's own credentials — same auth
// that lets them edit reports.
export async function importTurnover({ monthlyDocs = [], baselineDocs = [] }) {
  const stamp = { updatedAt: serverTimestamp(), updatedByName: currentName(), importedFromExcel: true };

  const ops = [
    ...baselineDocs.map(d => ({ ref: doc(db, 'turnoverBaseline', d.id), data: baselinePayload(d) })),
    ...monthlyDocs.map(d => ({ ref: doc(db, 'turnoverMonthly', d.id), data: monthlyPayload(d) })),
  ];

  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, data } of ops.slice(i, i + 450)) {
      batch.set(ref, { ...data, ...stamp }, { merge: true });
    }
    await batch.commit();
  }
  return { monthly: monthlyDocs.length, baseline: baselineDocs.length };
}
