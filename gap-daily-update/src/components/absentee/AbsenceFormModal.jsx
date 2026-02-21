import { useState } from 'react';
import { PLANTS, ABSENCE_TYPES, LABOR_TYPES, SHIFTS, DURATIONS, ABSENCE_REASONS, getHoursForDuration } from '../../constants/absences';
import { updateAbsence } from '../../services/absenceService';
import styles from './AbsenceFormModal.module.css';

export function AbsenceFormModal({ absence, onClose }) {
  const [form, setForm] = useState({
    employeeName: absence.employeeName || '',
    plantId: absence.plantId || 'GAP',
    date: absence.date || '',
    type: absence.type || 'unplanned',
    laborType: absence.laborType || 'direct',
    shift: absence.shift || '1st',
    reason: absence.reason || 'sick',
    duration: absence.duration || 'full',
    durationHours: absence.durationHours ?? 8,
    customHours: absence.duration === 'custom' ? String(absence.durationHours) : '',
    notes: absence.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'duration') {
        next.durationHours = getHoursForDuration(value, prev.customHours);
      }
      if (name === 'customHours') {
        next.durationHours = parseFloat(value) || 0;
      }
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.employeeName.trim()) { setError('Employee name is required.'); return; }
    if (form.duration === 'custom' && (!form.customHours || parseFloat(form.customHours) <= 0)) {
      setError('Please enter valid custom hours.'); return;
    }
    setError(null);
    setSaving(true);
    try {
      const { customHours, ...rest } = form;
      await updateAbsence(absence.id, rest);
      onClose();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Edit Absence</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Employee Name *</label>
              <input className={styles.input} name="employeeName" value={form.employeeName} onChange={handleChange} />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Plant *</label>
              <select className={styles.select} name="plantId" value={form.plantId} onChange={handleChange}>
                {PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Date *</label>
              <input className={styles.input} type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Type *</label>
              <div className={styles.radioGroup}>
                {ABSENCE_TYPES.map(t => (
                  <label key={t.value} className={styles.radio}>
                    <input type="radio" name="type" value={t.value} checked={form.type === t.value} onChange={handleChange} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Labor Type *</label>
              <div className={styles.radioGroup}>
                {LABOR_TYPES.map(t => (
                  <label key={t.value} className={styles.radio}>
                    <input type="radio" name="laborType" value={t.value} checked={form.laborType === t.value} onChange={handleChange} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Shift *</label>
              <div className={styles.radioGroup}>
                {SHIFTS.map(s => (
                  <label key={s.value} className={styles.radio}>
                    <input type="radio" name="shift" value={s.value} checked={form.shift === s.value} onChange={handleChange} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Reason *</label>
              <select className={styles.select} name="reason" value={form.reason} onChange={handleChange}>
                {ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Duration *</label>
              <select className={styles.select} name="duration" value={form.duration} onChange={handleChange}>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              {form.duration === 'custom' && (
                <input className={styles.input} type="number" name="customHours" value={form.customHours}
                  onChange={handleChange} placeholder="Hours" min="0.5" max="12" step="0.5" style={{ marginTop: 6 }} />
              )}
            </div>
          </div>

          <div className={styles.group}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.textarea} name="notes" value={form.notes} onChange={handleChange} rows={2} />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
