import { AutoTextarea } from './AutoTextarea';
import { RowStatusCell } from './RowStatusCell';
import styles from './SubTable.module.css';

// Fixed predefined rows — matches the Excel exactly
const DOWNTIME_ROWS = [
  { id: 'dt_machine_equip',     label: 'Machine DT-Equipment (Mtc)' },
  { id: 'dt_machine_tooling',   label: 'Machine DT - Tooling'       },
  { id: 'dt_setup_die_change',  label: 'Set Up DT - Die Change'     },
  { id: 'dt_setup_cell',        label: 'Set Up DT - Cell'           },
  { id: 'dt_setup_coil_change', label: 'Set Up DT - Coil Change'    },
];

function calcPct(ttlHours, totalHours) {
  const h = parseFloat(ttlHours);
  const t = parseFloat(totalHours);
  if (!t || isNaN(h) || isNaN(t)) return '—';
  return (h / t * 100).toFixed(1) + '%';
}

// Always produce a stable normalized array from whatever is stored
function normalizeData(data) {
  const stored = data?.length ? data : [];
  const byId = Object.fromEntries(stored.map((r) => [r.id, r]));
  return DOWNTIME_ROWS.map((def) => ({
    id: def.id,
    ttlHours: '',
    notes: '',
    status: '',
    ...(byId[def.id] ?? {}),
  }));
}

export function DowntimeTable({ data, onChange, readOnly }) {
  const rows = normalizeData(data);

  // Denominator = sum of all row hours — deduced automatically, never entered by user
  const totalHours = rows.reduce((sum, r) => {
    const h = parseFloat(r.ttlHours);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  const updateRow = (id, field, value) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.statusCol}>Status</th>
            <th>Reason</th>
            <th className={styles.hoursCol}>TTL Hours</th>
            <th className={styles.pctCol}>%</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const def = DOWNTIME_ROWS.find((d) => d.id === row.id);
            return (
              <tr key={row.id}>
                <td className={styles.statusCol}>
                  <RowStatusCell
                    value={row.status}
                    onChange={(v) => updateRow(row.id, 'status', v)}
                    readOnly={readOnly}
                  />
                </td>
                <td className={styles.fixedLabel}>{def?.label}</td>
                <td className={styles.hoursCol}>
                  {readOnly ? (row.ttlHours || '—') : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.ttlHours ?? ''}
                      onChange={(e) => updateRow(row.id, 'ttlHours', e.target.value)}
                      placeholder="0"
                      className={styles.hoursInput}
                    />
                  )}
                </td>
                <td className={styles.pctCol}>
                  <span className={styles.calcPct}>
                    {calcPct(row.ttlHours, totalHours)}
                  </span>
                </td>
                <td>
                  {readOnly ? (row.notes || '') : (
                    <AutoTextarea
                      value={row.notes ?? ''}
                      onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                      placeholder="Notes"
                      className={styles.tableTextarea}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {totalHours > 0 && (
          <tfoot>
            <tr className={styles.totalRow}>
              <td />
              <td className={styles.totalLabel}>Daily DT</td>
              <td className={styles.hoursCol}>
                <strong>{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(2)}</strong>
              </td>
              <td className={styles.pctCol}>
                <span className={styles.calcPct}>100%</span>
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
