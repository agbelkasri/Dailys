import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getTodayDate, prevWeekday, nextWeekday } from '../../hooks/useDateNavigation';
import { useAbsences } from '../../hooks/useAbsences';
import { useHeadcounts } from '../../hooks/useHeadcounts';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { deleteAbsence } from '../../services/absenceService';
import { totalDirectLabor } from '../../services/headcountService';
import { PLANTS } from '../../constants/absences';
import { auth } from '../../firebase';
import { StatsCard, StatsGrid } from './StatsCard';
import { AbsenceTable } from './AbsenceTable';
import { AbsenceFormModal } from './AbsenceFormModal';
import { HeadcountModal } from './HeadcountModal';
import styles from './DailyView.module.css';

export function DailyView({ plantFilter }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [showHeadcount,  setShowHeadcount]  = useState(false);

  const { absences, loading, error } = useAbsences(selectedDate);
  const { headcounts }                = useHeadcounts();
  const isAdmin                       = useIsAdmin(auth.currentUser);

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

  // ── Absenteeism percentage of full-time direct-labor workforce ───────────
  // Denominator: sum of DL_1st + DL_2nd from /headcounts for the plant(s) in
  // scope. When no plant filter is applied, sum across all three plants.
  // Numerator: absences on the selected day where laborType=direct AND
  // (employmentType is full_time OR missing — defaults to full_time per the
  // submit form). Recomputes whenever absences or headcounts change — both
  // come from live Firestore subscriptions.
  const rate = useMemo(() => {
    const plantsInScope = plantFilter ? [plantFilter] : PLANTS.map(p => p.id);
    const denominator = plantsInScope.reduce(
      (sum, pid) => sum + totalDirectLabor(headcounts[pid]),
      0
    );

    const isFullTimeDL = (a) =>
      (a.laborType || 'direct') === 'direct' &&
      (a.employmentType || 'full_time') === 'full_time';

    const dlPlanned   = filtered.filter(a => isFullTimeDL(a) && a.type === 'planned').length;
    const dlUnplanned = filtered.filter(a => isFullTimeDL(a) && a.type === 'unplanned').length;
    const dlTotal     = dlPlanned + dlUnplanned;

    const pct = (n) => denominator > 0
      ? ((n / denominator) * 100).toFixed(1) + '%'
      : '—';

    return {
      denominator,
      dlPlanned,
      dlUnplanned,
      dlTotal,
      totalPct:     pct(dlTotal),
      plannedPct:   pct(dlPlanned),
      unplannedPct: pct(dlUnplanned),
    };
  }, [filtered, headcounts, plantFilter]);

  const scopeLabel = plantFilter
    ? `FT DL @ ${plantFilter}`
    : 'FT DL all plants';

  function goToPrev() {
    setSelectedDate(prevWeekday(selectedDate));
  }
  function goToNext() {
    const next = nextWeekday(selectedDate);
    if (next <= getTodayDate()) setSelectedDate(next);
  }
  function goToToday() {
    setSelectedDate(getTodayDate());
  }

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
  const isToday = selectedDate === getTodayDate();
  const canGoNext = nextWeekday(selectedDate) <= getTodayDate();

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

      {/* Absenteeism rate — % of full-time direct-labor workforce out today */}
      <div className={styles.rateHeader}>
        <div className={styles.rateHeaderText}>
          Absenteeism rate — share of {scopeLabel} workforce out this day
          {rate.denominator > 0 && (
            <span className={styles.rateDenominator}>
              {' '}(denominator: {rate.denominator})
            </span>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            className={styles.headcountBtn}
            onClick={() => setShowHeadcount(true)}
          >
            {rate.denominator > 0 ? 'Edit headcount' : 'Set headcount'}
          </button>
        )}
      </div>

      {rate.denominator === 0 && (
        <div className={styles.headcountWarning}>
          {isAdmin
            ? 'No headcount set yet — click "Set headcount" to enable percentage calculations.'
            : 'Percentages will appear once an admin enters the plant headcount.'}
        </div>
      )}

      <StatsGrid>
        <StatsCard
          label="Total Absenteeism %"
          value={rate.totalPct}
          sub={`${rate.dlTotal} of ${rate.denominator || '—'} FT DL`}
          accent="#1a3a5c"
        />
        <StatsCard
          label="Planned %"
          value={rate.plannedPct}
          sub={`${rate.dlPlanned} of ${rate.denominator || '—'} FT DL`}
          accent="#2563eb"
        />
        <StatsCard
          label="Unplanned %"
          value={rate.unplannedPct}
          sub={`${rate.dlUnplanned} of ${rate.denominator || '—'} FT DL`}
          accent="#dc2626"
        />
      </StatsGrid>

      {/* Raw counts — still useful for daily ops */}
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

      {/* Headcount edit modal (admin-only) */}
      {showHeadcount && (
        <HeadcountModal
          headcounts={headcounts}
          onClose={() => setShowHeadcount(false)}
        />
      )}
    </div>
  );
}
