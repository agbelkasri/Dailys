import { useState } from 'react';
import { PLANTS } from '../../constants/absences';
import { setPlantHeadcount } from '../../services/headcountService';
import styles from './HeadcountModal.module.css';

/**
 * Admin-only modal for editing per-plant headcount.
 *
 * Headcount drives the absenteeism-rate denominators on the Daily View:
 *   planned %   = planned   DL absences / total FT DL workers
 *   unplanned % = unplanned DL absences / total FT DL workers
 *
 * Saving is per-plant (one Firestore write per plant where the user
 * actually changed a field), so leaving other plants untouched is cheap.
 */
export function HeadcountModal({ headcounts, onClose }) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(PLANTS.map(p => [
      p.id,
      {
        DL_1st:  headcounts[p.id]?.DL_1st  ?? '',
        DL_2nd:  headcounts[p.id]?.DL_2nd  ?? '',
        IDL_1st: headcounts[p.id]?.IDL_1st ?? '',
        IDL_2nd: headcounts[p.id]?.IDL_2nd ?? '',
      },
    ]))
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function update(plantId, field, value) {
    // Allow blank while editing; coerce on save
    if (value !== '' && !/^\d+$/.test(value)) return;
    setDrafts(d => ({ ...d, [plantId]: { ...d[plantId], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // Only write plants whose values actually changed
      const writes = [];
      for (const p of PLANTS) {
        const draft = drafts[p.id];
        const current = headcounts[p.id] || {};
        const changed =
          (Number(draft.DL_1st)  || 0) !== (current.DL_1st  || 0) ||
          (Number(draft.DL_2nd)  || 0) !== (current.DL_2nd  || 0) ||
          (Number(draft.IDL_1st) || 0) !== (current.IDL_1st || 0) ||
          (Number(draft.IDL_2nd) || 0) !== (current.IDL_2nd || 0);
        if (changed) writes.push(setPlantHeadcount(p.id, draft));
      }
      await Promise.all(writes);
      onClose();
    } catch (err) {
      console.error('Headcount save failed:', err);
      setError(err.message || 'Failed to save headcount');
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Plant Headcount</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className={styles.help}>
          Used as the denominator for daily Planned / Unplanned absenteeism
          percentages on this page. Numbers should represent the full-time
          workforce on each shift.
        </p>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <div />
            <div>DL — 1st</div>
            <div>DL — 2nd</div>
            <div>IDL — 1st</div>
            <div>IDL — 2nd</div>
            <div>Total DL</div>
          </div>
          {PLANTS.map(p => {
            const d = drafts[p.id];
            const totalDL = (Number(d.DL_1st) || 0) + (Number(d.DL_2nd) || 0);
            return (
              <div key={p.id} className={styles.tableRow}>
                <div className={styles.plantCell}>{p.name}</div>
                <input
                  type="text" inputMode="numeric" pattern="\d*"
                  className={styles.input}
                  value={d.DL_1st}
                  onChange={e => update(p.id, 'DL_1st', e.target.value)}
                />
                <input
                  type="text" inputMode="numeric" pattern="\d*"
                  className={styles.input}
                  value={d.DL_2nd}
                  onChange={e => update(p.id, 'DL_2nd', e.target.value)}
                />
                <input
                  type="text" inputMode="numeric" pattern="\d*"
                  className={styles.input}
                  value={d.IDL_1st}
                  onChange={e => update(p.id, 'IDL_1st', e.target.value)}
                />
                <input
                  type="text" inputMode="numeric" pattern="\d*"
                  className={styles.input}
                  value={d.IDL_2nd}
                  onChange={e => update(p.id, 'IDL_2nd', e.target.value)}
                />
                <div className={styles.totalCell}>{totalDL}</div>
              </div>
            );
          })}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
