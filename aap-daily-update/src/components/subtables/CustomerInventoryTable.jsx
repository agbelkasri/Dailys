import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RowStatusCell } from './RowStatusCell';
import { AutoTextarea } from './AutoTextarea';
import styles from './SubTable.module.css';

export function CustomerInventoryTable({ data, onChange, readOnly, isAdmin }) {
  const rows = data?.length ? data : [];
  const canDrag = isAdmin && !readOnly;

  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const addRow = () => {
    onChange([
      ...rows,
      { id: uuidv4(), customer: '', programNumber: '', partsSupplied: '', coverageNotes: '', status: '' },
    ]);
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

  const colSpan = (readOnly ? 5 : 6) + (canDrag ? 1 : 0);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {canDrag && <th className={styles.dragCol}></th>}
            <th className={styles.statusCol}>Status</th>
            <th>Customer</th>
            <th className={styles.programCol}>Program #</th>
            <th className={styles.partsCol}># Parts Supplied</th>
            <th>Coverage Notes</th>
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
                <RowStatusCell
                  value={row.status}
                  onChange={(v) => updateRow(row.id, 'status', v)}
                  readOnly={readOnly}
                />
              </td>
              <td>
                {readOnly ? row.customer : (
                  <input
                    value={row.customer}
                    onChange={(e) => updateRow(row.id, 'customer', e.target.value)}
                    placeholder="e.g. GM-FZ"
                  />
                )}
              </td>
              <td className={styles.programCol}>
                {readOnly ? row.programNumber : (
                  <input
                    value={row.programNumber}
                    onChange={(e) => updateRow(row.id, 'programNumber', e.target.value)}
                    placeholder="Program #"
                  />
                )}
              </td>
              <td className={styles.partsCol}>
                {readOnly ? row.partsSupplied : (
                  <input
                    value={row.partsSupplied}
                    onChange={(e) => updateRow(row.id, 'partsSupplied', e.target.value)}
                    placeholder="0"
                    className={styles.narrowInput}
                  />
                )}
              </td>
              <td>
                {readOnly
                  ? <div className={styles.coverageReadOnly}>{row.coverageNotes}</div>
                  : (
                  <AutoTextarea
                    value={row.coverageNotes}
                    onChange={(e) => updateRow(row.id, 'coverageNotes', e.target.value)}
                    placeholder="Coverage notes"
                    className={styles.coverageTextarea}
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
