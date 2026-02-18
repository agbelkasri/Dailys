import { v4 as uuidv4 } from 'uuid';
import styles from './SubTable.module.css';

export function DowntimeTable({ data, onChange, readOnly }) {
  const rows = data?.length ? data : [];

  const addRow = () => {
    onChange([...rows, { id: uuidv4(), reason: '', percentage: '' }]);
  };

  const updateRow = (id, field, value) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Reason</th>
            <th className={styles.narrowCol}>Percentage</th>
            {!readOnly && <th className={styles.actionCol}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={readOnly ? 2 : 3} className={styles.emptyRow}>
                {readOnly ? 'No entries' : 'No rows yet — click Add Row'}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {readOnly ? (
                  row.reason
                ) : (
                  <input
                    value={row.reason}
                    onChange={(e) => updateRow(row.id, 'reason', e.target.value)}
                    placeholder="Downtime reason"
                    className={styles.wideInput}
                  />
                )}
              </td>
              <td>
                {readOnly ? (
                  row.percentage
                ) : (
                  <input
                    value={row.percentage}
                    onChange={(e) => updateRow(row.id, 'percentage', e.target.value)}
                    placeholder="0%"
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
