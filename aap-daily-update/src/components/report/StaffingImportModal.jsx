import { useState } from 'react';
import { addAbsence } from '../../services/absenceService';
import {
  ABSENCE_TYPES,
  LABOR_TYPES,
  SHIFTS,
  DURATIONS,
  ABSENCE_REASONS,
} from '../../constants/absences';
import styles from './StaffingImportModal.module.css';

/**
 * Review-and-confirm modal for importing parsed Staffing Issues entries
 * into the Absentee Report.
 *
 * Props
 * ─────
 *  entries       – initial array of absence draft objects from parseStaffingIssues()
 *  plantId       – e.g. 'EAP'
 *  date          – YYYY-MM-DD string (the report date)
 *  onClose()     – called when the modal should be dismissed
 *  onImported(n) – called after successful import with the count saved
 */
export function StaffingImportModal({ entries: initialEntries, plantId, date, onClose, onImported }) {
  const [entries, setEntries] = useState(initialEntries);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const updateEntry = (idx, field, value) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      // Keep durationHours in sync when the duration key changes
      if (field === 'duration') {
        const dur = DURATIONS.find(d => d.value === value);
        updated.durationHours = dur?.hours ?? 8;
      }
      return updated;
    }));
  };

  const removeEntry = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    setSaving(true);
    setError('');
    try {
      await Promise.all(entries.map(e => addAbsence(e)));
      onImported?.(entries.length);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save absences. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="si-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="si-title">Import from Staffing Issues</h2>
            <p className={styles.subtitle}>
              {plantId} · {date} · Review each entry before saving to the Absentee Report.
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close" disabled={saving}>✕</button>
        </div>

        {entries.length === 0 ? (
          <div className={styles.empty}>
            <p>No absences could be parsed from the staffing issues text.</p>
            <p className={styles.emptyHint}>
              Check that the text includes "Planned Absenteeism:" or "Unplanned Absenteeism:" headers
              followed by lines like <code>DL: 1st shift: Name1, Name2</code>.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colName}>Employee Name</th>
                  <th className={styles.colType}>Type</th>
                  <th className={styles.colLabor}>Labor</th>
                  <th className={styles.colShift}>Shift</th>
                  <th className={styles.colDur}>Duration</th>
                  <th className={styles.colReason}>Reason</th>
                  <th className={styles.colRemove}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={idx} className={!entry.reason ? styles.rowMissingReason : ''}>
                    <td className={styles.colName}>
                      <input
                        className={styles.input}
                        value={entry.employeeName}
                        onChange={e => updateEntry(idx, 'employeeName', e.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td className={styles.colType}>
                      <select
                        className={styles.select}
                        value={entry.type}
                        onChange={e => updateEntry(idx, 'type', e.target.value)}
                        disabled={saving}
                      >
                        {ABSENCE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.colLabor}>
                      <select
                        className={styles.select}
                        value={entry.laborType}
                        onChange={e => updateEntry(idx, 'laborType', e.target.value)}
                        disabled={saving}
                      >
                        {LABOR_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.colShift}>
                      <select
                        className={styles.select}
                        value={entry.shift}
                        onChange={e => updateEntry(idx, 'shift', e.target.value)}
                        disabled={saving}
                      >
                        {SHIFTS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.colDur}>
                      <select
                        className={styles.select}
                        value={entry.duration}
                        onChange={e => updateEntry(idx, 'duration', e.target.value)}
                        disabled={saving}
                      >
                        {DURATIONS.filter(d => d.value !== 'custom').map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.colReason}>
                      <select
                        className={`${styles.select} ${!entry.reason ? styles.selectEmpty : ''}`}
                        value={entry.reason}
                        onChange={e => updateEntry(idx, 'reason', e.target.value)}
                        disabled={saving}
                      >
                        <option value="">— select —</option>
                        {ABSENCE_REASONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.colRemove}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeEntry(idx)}
                        title="Remove this entry"
                        disabled={saving}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            {entries.length > 0 && entries.some(e => !e.reason) && (
              <span className={styles.reasonWarning}>⚠ Some entries have no reason selected.</span>
            )}
          </span>
          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            {entries.length > 0 && (
              <button className={styles.importBtn} onClick={handleImport} disabled={saving}>
                {saving
                  ? 'Importing…'
                  : `Import ${entries.length} Absence${entries.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
