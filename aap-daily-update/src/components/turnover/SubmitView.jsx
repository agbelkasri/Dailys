import { useState } from 'react';
import {
  PLANTS, TURNOVER_TYPES, LABOR_TYPES, SHIFTS,
  EMPLOYMENT_TYPES, TURNOVER_REASONS, TENURE_OPTIONS, REHIRE_OPTIONS,
} from '../../constants/turnovers';
import { addTurnover } from '../../services/turnoverService';
import { getTodayDate } from '../../hooks/useDateNavigation';
import styles from './SubmitView.module.css';

const EMPTY_FORM = {
  employeeName: '',
  plantId: 'GAP',
  lastDay: getTodayDate(),
  type: 'voluntary',
  employmentType: 'full_time',
  laborType: 'direct',
  shift: '1st',
  reason: 'resignation',
  tenure: 'under_3mo',
  rehireEligible: 'unknown',
  notes: '',
};

export function SubmitView({ onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.employeeName.trim()) { setError('Employee name is required.'); return; }
    if (!form.lastDay) { setError('Last day is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await addTurnover(form);
      setForm(EMPTY_FORM);
      onSuccess?.();
    } catch (err) {
      setError('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Submit Departure</h2>
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
            <label className={styles.label}>Last Day *</label>
            <input className={styles.input} type="date" name="lastDay" value={form.lastDay} onChange={handleChange} />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Type *</label>
            <div className={styles.radioGroup}>
              {TURNOVER_TYPES.map(t => (
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
            <label className={styles.label}>Employment Type *</label>
            <div className={styles.radioGroup}>
              {EMPLOYMENT_TYPES.map(t => (
                <label key={t.value} className={styles.radio}>
                  <input type="radio" name="employmentType" value={t.value} checked={form.employmentType === t.value} onChange={handleChange} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
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
        </div>

        <div className={styles.row}>
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
          <div className={styles.group}>
            <label className={styles.label}>Eligible for Rehire *</label>
            <div className={styles.radioGroup}>
              {REHIRE_OPTIONS.map(r => (
                <label key={r.value} className={styles.radio}>
                  <input type="radio" name="rehireEligible" value={r.value} checked={form.rehireEligible === r.value} onChange={handleChange} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.group}>
            <label className={styles.label}>Reason *</label>
            <select className={styles.select} name="reason" value={form.reason} onChange={handleChange}>
              {TURNOVER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Tenure *</label>
            <select className={styles.select} name="tenure" value={form.tenure} onChange={handleChange}>
              {TENURE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
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
            {submitting ? 'Submitting…' : 'Submit Departure'}
          </button>
        </div>
      </form>
    </div>
  );
}
