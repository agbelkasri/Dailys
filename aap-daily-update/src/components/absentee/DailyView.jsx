import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getTodayDate, prevWeekday, nextWeekday, snapToSelectableWeekday } from '../../hooks/useDateNavigation';
import { DateJumpButton } from '../common/DateJumpButton';
import { useAbsences } from '../../hooks/useAbsences';
import { useStaffingByPlant } from '../../hooks/useStaffingByPlant';
import { useHolidays } from '../../hooks/useHolidays';
import { isHoliday } from '../../utils/holidays';
import { deleteAbsence } from '../../services/absenceService';
import { PLANTS } from '../../constants/absences';
import { parseStaffingIssues, parseStaffingHeadcount } from '../../utils/parseStaffingIssues';
import { StatsCard, StatsGrid } from './StatsCard';
import { AbsenceTable } from './AbsenceTable';
import { AbsenceFormModal } from './AbsenceFormModal';
import styles from './DailyView.module.css';

export function DailyView({ plantFilter }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [editingAbsence, setEditingAbsence] = useState(null);

  const { absences, loading, error }              = useAbsences(selectedDate);
  const { byPlant: staffingByPlant,
          loading: staffingLoading }              = useStaffingByPlant(selectedDate, plantFilter);
  const holidays = useHolidays();

  // The editable table shows unplanned absences only — planned is no longer
  // a user-facing classification (the record's type is kept in Firestore).
  const filtered = useMemo(() => {
    const unplannedOnly = absences.filter(a => a.type !== 'planned');
    return plantFilter ? unplannedOnly.filter(a => a.plantId === plantFilter) : unplannedOnly;
  },
    [absences, plantFilter]
  );

  // Single source of truth for "today's absences" — parsed directly from
  // each in-scope plant's Staffing Issues comment. Used by both the count
  // cards (stats) and the percentage cards (rate), so they always agree
  // and auto-populate as the supervisor edits the comment.
  //
  // The /absences collection (above, via useAbsences) is kept for the
  // editable absence table further down — that's where "Submit Absence"
  // form entries and "Import to Absentee" results live with editable
  // reason / duration metadata.
  const parsedAbsences = useMemo(() => {
    const plantsInScope = plantFilter ? [plantFilter] : PLANTS.map(p => p.id);
    const all = [];
    for (const plantId of plantsInScope) {
      if (isHoliday(holidays, plantId, selectedDate)) continue;  // plant closed — skip
      const text = staffingByPlant[plantId]?.comments;
      if (!text) continue;
      all.push(...parseStaffingIssues(text, { plantId, date: selectedDate }));
    }
    return all;
  }, [staffingByPlant, plantFilter, selectedDate, holidays]);

  // HR's headline metric is UNPLANNED absenteeism — every count card here
  // uses unplanned only, except the card explicitly labeled "Planned".
  const stats = useMemo(() => {
    const unplannedAbs = parsedAbsences.filter(a => a.type === 'unplanned');
    const unplanned  = unplannedAbs.length;
    const direct     = unplannedAbs.filter(a => a.laborType === 'direct').length;
    const indirect   = unplannedAbs.filter(a => a.laborType === 'indirect').length;
    const plants     = new Set(unplannedAbs.map(a => a.plantId)).size;
    const totalHours = unplannedAbs.reduce((s, a) => s + (a.durationHours || 0), 0);
    return { unplanned, direct, indirect, plants, totalHours };
  }, [parsedAbsences]);

  // ── Absenteeism % of full-time direct-labor workforce ────────────────────
  // Both numerator AND denominator come from each plant's Staffing Issues
  // comment for the selected day:
  //
  //   Planned Absenteeism:
  //     DL:  1st shift: Nate Fawley       ← parsed → planned DL absence
  //     IDL: 1st shift:
  //     DL:  2nd Shift:
  //     IDL: 2nd Shift:
  //   DL = 1st - 26, 2nd - 11             ← parsed → headcount: 37 FT DL
  //
  // No separate headcount table — the supervisor enters everything in the
  // daily report's Staffing Issues section, and these percentages recompute
  // live (Firestore onSnapshot) as that comment is edited. When "All Plants"
  // is selected, numerators and denominators are summed across all three.
  const rate = useMemo(() => {
    const plantsInScope = plantFilter ? [plantFilter] : PLANTS.map(p => p.id);

    let dlPlanned = 0, dlUnplanned = 0, dlHeadcount = 0;
    let idlPlanned = 0, idlUnplanned = 0, idlHeadcount = 0;

    // Headcount comes from parsing the staffing comment's totals lines —
    // parseStaffingHeadcount only needs the raw text, not the absence list.
    for (const plantId of plantsInScope) {
      if (isHoliday(holidays, plantId, selectedDate)) continue;  // plant closed — no shifts
      const text = staffingByPlant[plantId]?.comments;
      if (!text) continue;
      const hc = parseStaffingHeadcount(text);
      // DL_total / IDL_total each resolve to (1st + 2nd) for shift-split
      // lines or to the single total for "DL = N" / "IDL = N" lines.
      if (hc?.DL_total  != null) dlHeadcount  += hc.DL_total;
      if (hc?.IDL_total != null) idlHeadcount += hc.IDL_total;
    }

    // Absences come from the shared parsedAbsences memo so the count
    // cards and percentage cards stay in lockstep.
    for (const a of parsedAbsences) {
      if (a.laborType === 'direct') {
        if (a.type === 'planned')   dlPlanned++;
        if (a.type === 'unplanned') dlUnplanned++;
      } else if (a.laborType === 'indirect') {
        if (a.type === 'planned')   idlPlanned++;
        if (a.type === 'unplanned') idlUnplanned++;
      }
    }

    const dlTotal  = dlPlanned + dlUnplanned;
    const idlTotal = idlPlanned + idlUnplanned;

    const pct  = (n) => dlHeadcount  > 0 ? ((n / dlHeadcount)  * 100).toFixed(1) + '%' : '—';
    const ipct = (n) => idlHeadcount > 0 ? ((n / idlHeadcount) * 100).toFixed(1) + '%' : '—';

    // Combined workforce (DL + IDL) — drives the Total Absenteeism % card.
    // The hero already splits by labor type, so the Total card aggregates
    // across BOTH pools or it would just repeat the hero's DL half.
    const combinedHeadcount = dlHeadcount + idlHeadcount;
    const cpct = (n) => combinedHeadcount > 0 ? ((n / combinedHeadcount) * 100).toFixed(1) + '%' : '—';
    const combinedUnplanned = dlUnplanned + idlUnplanned;

    return {
      headcount:    dlHeadcount,
      idlHeadcount,
      dlPlanned, dlUnplanned, dlTotal,
      idlPlanned, idlUnplanned, idlTotal,
      // Combined DL+IDL — the Total Absenteeism % card below the hero
      combinedHeadcount, combinedUnplanned,
      totalPct:     cpct(combinedUnplanned),
      // Headline DL vs IDL card — HR tracks UNPLANNED absenteeism, so the
      // hero shows each labor type's unplanned rate against its workforce.
      dlRatePct:    pct(dlUnplanned),
      idlRatePct:   ipct(idlUnplanned),
    };
  }, [staffingByPlant, parsedAbsences, plantFilter, selectedDate, holidays]);

  const scopeLabel = plantFilter ? plantFilter : 'all plants';

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
  function jumpTo(dateStr) {
    setSelectedDate(snapToSelectableWeekday(dateStr, getTodayDate()));
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
          <DateJumpButton value={selectedDate} max={getTodayDate()} onSelect={jumpTo}>
            <span className={styles.dateText}>{displayDate}</span>
          </DateJumpButton>
          {isToday && <span className={styles.todayTag}>Today</span>}
        </div>
        <button className={styles.navBtn} onClick={goToNext} disabled={!canGoNext}>›</button>
        {!isToday && (
          <button className={styles.todayBtn} onClick={goToToday}>Today</button>
        )}
      </div>

      {/* Absenteeism rate — % of FT DL workforce out this day, parsed live
          from the Staffing Issues comment(s) for the selected plant(s). */}
      <div className={styles.rateHeader}>
        <div className={styles.rateHeaderText}>
          Absenteeism rate — {scopeLabel}
          {rate.combinedHeadcount > 0 && (
            <span className={styles.rateDenominator}>
              {' '}({rate.combinedUnplanned} of {rate.combinedHeadcount} workers)
            </span>
          )}
        </div>
      </div>

      {rate.headcount === 0 && !staffingLoading && (
        <div className={styles.headcountWarning}>
          Percentages need a headcount line in the Staffing Issues comment
          (e.g. <code>DL = 1st - 26, 2nd - 11</code>). Once present, this
          section updates automatically.
        </div>
      )}

      {/* Total Absenteeism — full-width headline over the DL/IDL split. */}
      <div className={styles.totalHero}>
        <div className={styles.totalHeroPct}>{rate.totalPct}</div>
        <div className={styles.totalHeroLabel}>Total Absenteeism</div>
        <div className={styles.totalHeroSub}>
          {rate.combinedUnplanned} of {rate.combinedHeadcount || '—'} workers (DL + IDL)
        </div>
      </div>

      {/* Direct vs Indirect Labor breakdown. HR tracks UNPLANNED
          absenteeism, so each side shows the unplanned rate against its
          own workforce headcount (DL or IDL). */}
      <div className={styles.dlIdlHero}>
        <div className={styles.dlIdlHalf}>
          <div className={styles.dlIdlPct}>{rate.dlRatePct}</div>
          <div className={styles.dlIdlLabel}>Direct Labor</div>
          <div className={styles.dlIdlSub}>
            {rate.dlUnplanned} of {rate.headcount || '—'} DL workers
          </div>
        </div>
        <div className={styles.dlIdlDivider} aria-hidden="true" />
        <div className={styles.dlIdlHalf}>
          <div className={styles.dlIdlPct}>{rate.idlRatePct}</div>
          <div className={styles.dlIdlLabel}>Indirect Labor</div>
          <div className={styles.dlIdlSub}>
            {rate.idlUnplanned} of {rate.idlHeadcount || '—'} IDL workers
          </div>
        </div>
      </div>

      {/* Raw counts — still useful for daily ops */}
      <StatsGrid>
        <StatsCard label="Total Absences" value={stats.unplanned} accent="#1a3a5c" />
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
