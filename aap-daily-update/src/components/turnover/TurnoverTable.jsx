import { useState } from 'react';
import { PLANTS, REASON_LABELS, TENURE_LABELS } from '../../constants/turnovers';
import styles from './TurnoverTable.module.css';

const PLANT_MAP = Object.fromEntries(PLANTS.map(p => [p.id, p.name]));

const COLUMNS = [
  { key: 'employeeName',   label: 'Employee' },
  { key: 'plantId',        label: 'Plant' },
  { key: 'type',           label: 'Type' },
  { key: 'laborType',      label: 'Labor' },
  { key: 'shift',          label: 'Shift' },
  { key: 'reason',         label: 'Reason' },
  { key: 'tenure',         label: 'Tenure' },
  { key: 'rehireEligible', label: 'Rehire?' },
];

export function TurnoverTable({ turnovers, onEdit, onDelete, readOnly = false }) {
  const [sortCol, setSortCol] = useState('employeeName');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const sorted = [...turnovers].sort((a, b) => {
    let av = a[sortCol] || '';
    let bv = b[sortCol] || '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function sortIcon(col) {
    if (sortCol !== col) return ' ⇅';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  if (turnovers.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🚪</div>
        <div className={styles.emptyText}>No departures recorded for this day.</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={styles.th}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
              {!readOnly && <th className={styles.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map(t => (
              <tr key={t.id} className={`${styles.row} ${t.type === 'involuntary' ? styles.rowInvoluntary : ''}`}>
                <td className={styles.td}><strong>{t.employeeName}</strong></td>
                <td className={styles.td}>{PLANT_MAP[t.plantId] || t.plantId}</td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${t.type === 'voluntary' ? styles.badgeVoluntary : styles.badgeInvoluntary}`}>
                    {t.type === 'voluntary' ? 'Voluntary' : 'Involuntary'}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${t.laborType === 'indirect' ? styles.badgeIndirect : styles.badgeDirect}`}>
                    {t.laborType === 'indirect' ? 'Indirect' : 'Direct'}
                  </span>
                </td>
                <td className={styles.td}>{t.shift}</td>
                <td className={styles.td}>{REASON_LABELS[t.reason] || t.reason}</td>
                <td className={styles.td}>{TENURE_LABELS[t.tenure] || t.tenure}</td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${
                    t.rehireEligible === 'yes' ? styles.badgeRehireYes :
                    t.rehireEligible === 'no'  ? styles.badgeRehireNo :
                    styles.badgeRehireUnknown
                  }`}>
                    {t.rehireEligible === 'yes' ? 'Yes' : t.rehireEligible === 'no' ? 'No' : 'Unknown'}
                  </span>
                </td>
                {!readOnly && (
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => onEdit?.(t)} title="Edit">✏️</button>
                      <button className={styles.deleteBtn} onClick={() => onDelete?.(t.id, t.employeeName)} title="Delete">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.footer}>{turnovers.length} record{turnovers.length !== 1 ? 's' : ''}</div>
    </div>
  );
}
