import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getTodayDate, prevWeekday, nextWeekday } from '../../hooks/useDateNavigation';
import { useTurnovers } from '../../hooks/useTurnovers';
import { deleteTurnover } from '../../services/turnoverService';
import { StatsCard, StatsGrid } from '../absentee/StatsCard';
import { TurnoverTable } from './TurnoverTable';
import { TurnoverFormModal } from './TurnoverFormModal';
import styles from './DailyView.module.css';

export function DailyView({ plantFilter }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [editingTurnover, setEditingTurnover] = useState(null);

  const { turnovers, loading, error } = useTurnovers(selectedDate);

  const filtered = useMemo(() =>
    plantFilter ? turnovers.filter(t => t.plantId === plantFilter) : turnovers,
    [turnovers, plantFilter]
  );

  const stats = useMemo(() => {
    const total       = filtered.length;
    const voluntary   = filtered.filter(t => t.type === 'voluntary').length;
    const involuntary = filtered.filter(t => t.type === 'involuntary').length;
    const direct      = filtered.filter(t => (t.laborType || 'direct') === 'direct').length;
    const indirect    = filtered.filter(t => t.laborType === 'indirect').length;
    const plants      = new Set(filtered.map(t => t.plantId)).size;
    const rehireYes   = filtered.filter(t => t.rehireEligible === 'yes').length;
    return { total, voluntary, involuntary, direct, indirect, plants, rehireYes };
  }, [filtered]);

  function goToPrev() { setSelectedDate(prevWeekday(selectedDate)); }
  function goToNext() {
    const next = nextWeekday(selectedDate);
    if (next <= getTodayDate()) setSelectedDate(next);
  }
  function goToToday() { setSelectedDate(getTodayDate()); }

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
  const isToday     = selectedDate === getTodayDate();
  const canGoNext   = nextWeekday(selectedDate) <= getTodayDate();

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete departure record for ${name}?`)) return;
    try {
      await deleteTurnover(id);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  return (
    <div>
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

      <StatsGrid>
        <StatsCard label="Total Departures"  value={stats.total}       accent="#1a3a5c" />
        <StatsCard label="Voluntary"         value={stats.voluntary}   accent="#2563eb" />
        <StatsCard label="Involuntary"       value={stats.involuntary} accent="#dc2626" />
        <StatsCard label="Direct Labor"      value={stats.direct}      accent="#16a34a" />
        <StatsCard label="Indirect Labor"    value={stats.indirect}    accent="#d97706" />
        <StatsCard label="Plants Affected"   value={stats.plants}      accent="#7c3aed" />
        <StatsCard label="Rehire Eligible"   value={stats.rehireYes}   accent="#0891b2" />
      </StatsGrid>

      {loading ? (
        <div className={styles.loading}>Loading departures…</div>
      ) : error ? (
        <div className={styles.errorMsg}>{error}</div>
      ) : (
        <TurnoverTable
          turnovers={filtered}
          onEdit={t => setEditingTurnover(t)}
          onDelete={handleDelete}
        />
      )}

      {editingTurnover && (
        <TurnoverFormModal
          turnover={editingTurnover}
          onClose={() => setEditingTurnover(null)}
        />
      )}
    </div>
  );
}
