import { useState } from 'react';
import { PLANTS, REASON_LABELS, DURATION_LABELS } from '../../constants/absences';
import styles from './AbsenceTable.module.css';

const PLANT_MAP = Object.fromEntries(PLANTS.map(p => [p.id, p.name]));

const COLUMNS = [
  { key: 'employeeName', label: 'Employee' },
  { key: 'plantId',      label: 'Plant' },
  { key: 'type',         label: 'Type' },
  { key: 'laborType',    label: 'Labor' },
  { key: 'shift',        label: 'Shift' },
  { key: 'reason',       label: 'Reason' },
  { key: 'duration',     label: 'Duration' },
];

export function AbsenceTable({ absences, onEdit, onDelete, readOnly = false }) {
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

  const sorted = [...absences].sort((a, b) => {
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

  if (absences.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📋</div>
        <div className={styles.emptyText}>No absences recorded for this day.</div>
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
            {sorted.map(a => (
              <tr key={a.id} className={`${styles.row} ${a.type === 'unplanned' ? styles.rowUnplanned : ''}`}>
                <td className={styles.td}><strong>{a.employeeName}</strong></td>
                <td className={styles.td}>{PLANT_MAP[a.plantId] || a.plantId}</td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${a.type === 'planned' ? styles.badgePlanned : styles.badgeUnplanned}`}>
                    {a.type === 'planned' ? 'Planned' : 'Unplanned'}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${a.laborType === 'indirect' ? styles.badgeIndirect : styles.badgeDirect}`}>
                    {a.laborType === 'indirect' ? 'Indirect' : 'Direct'}
                  </span>
                </td>
                <td className={styles.td}>{a.shift}</td>
                <td className={styles.td}>{REASON_LABELS[a.reason] || a.reason}</td>
                <td className={styles.td}>
                  {DURATION_LABELS[a.duration] || a.duration}
                  {a.duration === 'custom' ? ` (${a.durationHours}h)` : ''}
                </td>
                {!readOnly && (
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => onEdit?.(a)}
                        title="Edit"
                      >✏️</button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => onDelete?.(a.id, a.employeeName)}
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.footer}>{absences.length} record{absences.length !== 1 ? 's' : ''}</div>
    </div>
  );
}
