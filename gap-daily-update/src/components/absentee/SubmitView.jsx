import { useState } from 'react';
import { PLANTS, ABSENCE_TYPES, LABOR_TYPES, SHIFTS, DURATIONS, ABSENCE_REASONS, getHoursForDuration } from '../../constants/absences';
import { addAbsence } from '../../services/absenceService';
import { getTodayDate } from '../../hooks/useDateNavigation';
import styles from './SubmitView.module.css';

const EMPTY_FORM = {
  employeeName: '',
  plantId: 'GAP',
  date: getTodayDate(),
  type: 'unplanned',
  laborType: 'direct',
  shift: '1st',
  reason: 'sick',
  duration: 'full',
  durationHours: 8,
  customHours: '',
  notes: '',
};

export function SubmitView({ onSuccess, prefill = null }) {
  const [form, setForm] = useState(prefill ? { ...EMPTY_FORM, ...prefill, customHours: '' } : EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.employeeName.trim()) { setError('Employee name is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    if (form.duration === 'custom' && (!form.customHours || parseFloat(form.customHours) <= 0)) {
      setError('Please enter valid custom hours.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const { customHours, ...rest } = form;
      await addAbsence({ ...rest });
      setForm(EMPTY_FORM);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Submit Absence</h2>
      <form className={styles.form} onSubmit={handleSubmit}>

        <div className={styles.row}>
          <div className={styles.group}>
            <label className={styles.label}>Employee Name *</label>
            <input
              className={styles.input}
              name="employeeName"
              value={form.employeeName}
              onChange={handleChange}
              placeholder="Enter employee name"
              autoComplete="off"
            />
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
              <div className={styles.customHours}>
                <input
                  className={styles.input}
                  type="number"
                  name="customHours"
                  value={form.customHours}
                  onChange={handleChange}
                  placeholder="0"
                  min="0.5"
                  max="12"
                  step="0.5"
                  style={{ marginTop: 6 }}
                />
                <span className={styles.hoursLabel}>hours</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Optional notes..."
            rows={3}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Absence'}
          </button>
        </div>
      </form>
    </div>
  );
}
