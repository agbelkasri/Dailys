import { useState, useMemo } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { getTodayDate } from '../../hooks/useDateNavigation';
import { useAbsences } from '../../hooks/useAbsences';
import { deleteAbsence } from '../../services/absenceService';
import { StatsCard, StatsGrid } from './StatsCard';
import { AbsenceTable } from './AbsenceTable';
import { AbsenceFormModal } from './AbsenceFormModal';
import styles from './DailyView.module.css';

export function DailyView({ plantFilter }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [editingAbsence, setEditingAbsence] = useState(null);

  const { absences, loading, error } = useAbsences(selectedDate);

  const filtered = useMemo(() =>
    plantFilter ? absences.filter(a => a.plantId === plantFilter) : absences,
    [absences, plantFilter]
  );

  const stats = useMemo(() => {
    const total      = filtered.length;
    const planned    = filtered.filter(a => a.type === 'planned').length;
    const unplanned  = filtered.filter(a => a.type === 'unplanned').length;
    const direct     = filtered.filter(a => (a.laborType || 'direct') === 'direct').length;
    const indirect   = filtered.filter(a => a.laborType === 'indirect').length;
    const plants     = new Set(filtered.map(a => a.plantId)).size;
    const totalHours = filtered.reduce((s, a) => s + (a.durationHours || 0), 0);
    return { total, planned, unplanned, direct, indirect, plants, totalHours };
  }, [filtered]);

  function goToPrev() {
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  }
  function goToNext() {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    if (next <= getTodayDate()) setSelectedDate(next);
  }
  function goToToday() {
    setSelectedDate(getTodayDate());
  }

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
  const isToday = selectedDate === getTodayDate();
  const canGoNext = selectedDate < getTodayDate();

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete absence for ${name}?`)) return;
    try {
      await deleteAbsence(id);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  return (
    <div>
      {/* Date nav bar */}
      <div className={styles.dateBar}>
        <button className={styles.navBtn} onClick={goToPrev}>‹</button>
        <div className={styles.dateInfo}>
          <span className={styles.dateText}>{displayDate}</span>
          {isToday && <span className={styles.todayTag}>Today</span>}
        </div>
        <button className={styles.navBtn} onClick={goToNext} disabled={!canGoNext}>›</button>
        {!isToday && (
          <button className={styles.todayBtn} onClick={goToToday}>Today</button>
        )}
      </div>

      {/* Stats */}
      <StatsGrid>
        <StatsCard label="Total Absences" value={stats.total} accent="#1a3a5c" />
        <StatsCard label="Planned"        value={stats.planned}   accent="#2563eb" />
        <StatsCard label="Unplanned"      value={stats.unplanned} accent="#dc2626" />
        <StatsCard label="Direct Labor"   value={stats.direct}    accent="#16a34a" />
        <StatsCard label="Indirect Labor" value={stats.indirect}  accent="#d97706" />
        <StatsCard label="Plants Affected" value={stats.plants}   accent="#7c3aed" />
        <StatsCard label="Total Hours"    value={stats.totalHours} accent="#0891b2" />
      </StatsGrid>

      {/* Table */}
      {loading ? (
        <div className={styles.loading}>Loading absences…</div>
      ) : error ? (
        <div className={styles.errorMsg}>{error}</div>
      ) : (
        <AbsenceTable
          absences={filtered}
          onEdit={a => setEditingAbsence(a)}
          onDelete={handleDelete}
        />
      )}

      {/* Edit modal */}
      {editingAbsence && (
        <AbsenceFormModal
          absence={editingAbsence}
          onClose={() => setEditingAbsence(null)}
        />
      )}
    </div>
  );
}
