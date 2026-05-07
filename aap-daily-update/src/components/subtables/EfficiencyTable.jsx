import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STATUS_COLORS, STATUS_TEXT_COLORS } from '../../constants/colors';
import styles from './SubTable.module.css';

function deriveStatus(pctStr) {
  const n = parseFloat(String(pctStr ?? '').replace(/[^0-9.]/g, ''));
  if (isNaN(n) || String(pctStr).trim() === '') return '';
  if (n >= 85) return 'G';
  if (n >= 69) return 'Y';
  return 'R';
}

function AutoStatusBadge({ percentage }) {
  const status = deriveStatus(percentage);
  const bg = STATUS_COLORS[status] ?? STATUS_COLORS[''];
  const color = STATUS_TEXT_COLORS[status] ?? STATUS_TEXT_COLORS[''];
  return (
    <span className={styles.statusBadge} style={{ backgroundColor: bg, color }}>
      {status || '—'}
    </span>
  );
}

export function EfficiencyTable({ data, onChange, readOnly, isAdmin }) {
  const rows = data?.length ? data : [];
  const canDrag = isAdmin && !readOnly;

  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const addRow = () => {
    onChange([...rows, { id: uuidv4(), description: '', percentage: '' }]);
  };

  const updateRow = (id, field, value) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const handleDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId.current || dragId.current === targetId) return;
    const srcIdx = rows.findIndex((r) => r.id === dragId.current);
    const tgtIdx = rows.findIndex((r) => r.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const next = [...rows];
    const [item] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, item);
    onChange(next);
  };

  const handleDragEnd = () => {
    dragId.current = null;
    setDragOverId(null);
  };

  const colSpan = (readOnly ? 3 : 4) + (canDrag ? 1 : 0);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {canDrag && <th className={styles.dragCol}></th>}
            <th className={styles.statusCol}>Status</th>
            <th>Description</th>
            <th className={styles.narrowCol}>Efficiency %</th>
            {!readOnly && <th className={styles.actionCol}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className={styles.emptyRow}>
                {readOnly ? 'No entries' : 'No rows yet — click Add Row'}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              draggable={canDrag}
              onDragStart={canDrag ? (e) => handleDragStart(e, row.id) : undefined}
              onDragOver={canDrag ? (e) => handleDragOver(e, row.id) : undefined}
              onDrop={canDrag ? (e) => handleDrop(e, row.id) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
              className={dragOverId === row.id ? styles.dragOverRow : undefined}
            >
              {canDrag && (
                <td className={styles.dragHandle} title="Drag to reorder">⠿</td>
              )}
              <td className={styles.statusCol}>
                <AutoStatusBadge percentage={row.percentage} />
              </td>
              <td>
                {readOnly ? row.description : (
                  <input
                    value={row.description}
                    onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                    placeholder="e.g. Line 1, Press #3"
                    className={styles.wideInput}
                  />
                )}
              </td>
              <td>
                {readOnly ? (row.percentage || '—') : (
                  <input
                    value={row.percentage}
                    onChange={(e) => updateRow(row.id, 'percentage', e.target.value)}
                    placeholder="e.g. 87%"
                    className={styles.narrowInput}
                  />
                )}
              </td>
              {!readOnly && (
                <td>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button className={styles.addBtn} onClick={addRow}>
          + Add Row
        </button>
      )}
    </div>
  );
}
