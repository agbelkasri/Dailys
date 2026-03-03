import { v4 as uuidv4 } from 'uuid';
import { STATUS_COLORS, STATUS_TEXT_COLORS } from '../../constants/colors';
import styles from './SubTable.module.css';

const STATUS_OPTIONS = ['', 'G', 'Y', 'R'];

function RowStatusCell({ value, onChange, readOnly }) {
  const color = STATUS_COLORS[value] ?? STATUS_COLORS[''];
  const textColor = STATUS_TEXT_COLORS[value] ?? STATUS_TEXT_COLORS[''];

  if (readOnly) {
    return (
      <span
        className={styles.statusBadge}
        style={{ backgroundColor: color, color: textColor }}
      >
        {value || '—'}
      </span>
    );
  }

  return (
    <select
      className={styles.statusSelect}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ borderColor: color, backgroundColor: value ? color : undefined, color: value ? textColor : undefined }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt || '—'}</option>
      ))}
    </select>
  );
}

export function CustomerInventoryTable({ data, onChange, readOnly }) {
  const rows = data?.length ? data : [];

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

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.statusCol}>Status</th>
            <th>Customer</th>
            <th>Program #</th>
            <th># Parts Supplied</th>
            <th>Coverage Notes</th>
            {!readOnly && <th className={styles.actionCol}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={readOnly ? 5 : 6} className={styles.emptyRow}>
                {readOnly ? 'No entries' : 'No rows yet — click Add Row'}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
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
              <td>
                {readOnly ? row.programNumber : (
                  <input
                    value={row.programNumber}
                    onChange={(e) => updateRow(row.id, 'programNumber', e.target.value)}
                    placeholder="Program #"
                  />
                )}
              </td>
              <td>
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
                {readOnly ? row.coverageNotes : (
                  <input
                    value={row.coverageNotes}
                    onChange={(e) => updateRow(row.id, 'coverageNotes', e.target.value)}
                    placeholder="Coverage notes"
                    className={styles.wideInput}
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
