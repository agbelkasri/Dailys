import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useYearlyStaffing } from '../../hooks/useYearlyStaffing';
import { useHolidays } from '../../hooks/useHolidays';
import { isHoliday } from '../../utils/holidays';
import { parseStaffingIssues, parseStaffingHeadcount } from '../../utils/parseStaffingIssues';
import { LineChart } from './charts/LineChart';
import styles from './YearlyView.module.css';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Year-to-Date view. Same person-day aggregation as Monthly View, just
 * summed across every weekday in the current year up to today. Adds a
 * 12-month trend chart with DL and IDL on the same axes so the owner
 * can see how each labor pool is moving over the year.
 */
export function YearlyView({ plantFilter }) {
  const [year] = useState(() => new Date().getFullYear());
  const { byKey: yearStaffing, loading, endDate } =
    useYearlyStaffing(year, plantFilter);
  const holidays = useHolidays();

  // ── Aggregate scheduled shifts across the year ────────────────────────────
  // For each weekday with a headcount line, the DL/IDL roster count contributes
  // that many "scheduled shifts" (one worker × one shift per day). Absences
  // are subtracted from those scheduled shifts to get the unfulfilled count.
  const rate = useMemo(() => {
    let dlPlanned = 0, dlUnplanned = 0, dlPersonDays = 0, dlDaysCounted = 0;
    let idlPlanned = 0, idlUnplanned = 0, idlPersonDays = 0;

    for (const entry of Object.values(yearStaffing)) {
      if (isHoliday(holidays, entry.plantId, entry.date)) continue;  // plant closed — skip
      const text = entry?.comments;
      if (!text) continue;
      const hc = parseStaffingHeadcount(text);
      if (!hc) continue;

      const parsed = parseStaffingIssues(text, { plantId: entry.plantId, date: entry.date });

      if (hc.DL_total != null) {
        dlDaysCounted++;
        dlPersonDays += hc.DL_total;
        for (const a of parsed) {
          if (a.laborType !== 'direct') continue;
          if (a.type === 'planned')   dlPlanned++;
          if (a.type === 'unplanned') dlUnplanned++;
        }
      }
      if (hc.IDL_total != null) {
        idlPersonDays += hc.IDL_total;
        for (const a of parsed) {
          if (a.laborType !== 'indirect') continue;
          if (a.type === 'planned')   idlPlanned++;
          if (a.type === 'unplanned') idlUnplanned++;
        }
      }
    }

    const dlTotal  = dlPlanned + dlUnplanned;
    const idlTotal = idlPlanned + idlUnplanned;
    const pct  = (n) => dlPersonDays  > 0 ? ((n / dlPersonDays)  * 100).toFixed(1) + '%' : '—';
    const ipct = (n) => idlPersonDays > 0 ? ((n / idlPersonDays) * 100).toFixed(1) + '%' : '—';

    // Combined workforce (DL + IDL shifts) — drives the Total Absenteeism %
    // card. The hero already splits by labor type, so the Total card
    // aggregates across BOTH pools or it would just repeat the DL half.
    const combinedShifts    = dlPersonDays + idlPersonDays;
    const cpct = (n) => combinedShifts > 0 ? ((n / combinedShifts) * 100).toFixed(1) + '%' : '—';
    const combinedUnplanned = dlUnplanned + idlUnplanned;

    return {
      personDays:    dlPersonDays,
      idlPersonDays,
      daysCounted:   dlDaysCounted,
      dlPlanned, dlUnplanned, dlTotal,
      idlPlanned, idlUnplanned, idlTotal,
      // Combined DL+IDL — the Total Absenteeism % card below the hero
      combinedShifts, combinedUnplanned,
      totalPct:     cpct(combinedUnplanned),
      // Headline DL vs IDL hero — HR tracks UNPLANNED absenteeism, so the
      // hero shows each labor type's unplanned rate over its person-days.
      dlRatePct:    pct(dlUnplanned),
      idlRatePct:   ipct(idlUnplanned),
    };
  }, [yearStaffing, holidays]);

  // ── Per-month breakdown — for the trend chart ────────────────────────────
  // Bucket every day by month, aggregate the same way, then compute each
  // month's DL and IDL absenteeism % as separate datasets.
  const trend = useMemo(() => {
    const monthly = Array.from({ length: 12 }, () => ({
      dlAbs: 0, dlPD: 0, idlAbs: 0, idlPD: 0,
    }));

    for (const entry of Object.values(yearStaffing)) {
      if (isHoliday(holidays, entry.plantId, entry.date)) continue;  // plant closed — skip
      const text = entry?.comments;
      if (!text) continue;
      const hc = parseStaffingHeadcount(text);
      if (!hc) continue;

      const monthIdx = parseInt(entry.date.slice(5, 7), 10) - 1;
      const bucket = monthly[monthIdx];
      const parsed = parseStaffingIssues(text, { plantId: entry.plantId, date: entry.date });

      // Unplanned only — matches the headline hero (HR's tracked metric)
      if (hc.DL_total != null) {
        bucket.dlPD += hc.DL_total;
        bucket.dlAbs += parsed.filter(a => a.laborType === 'direct' && a.type === 'unplanned').length;
      }
      if (hc.IDL_total != null) {
        bucket.idlPD += hc.IDL_total;
        bucket.idlAbs += parsed.filter(a => a.laborType === 'indirect' && a.type === 'unplanned').length;
      }
    }

    // Truncate at the last month that has any data so empty future months
    // don't drag the line to 0 visually.
    let lastWithData = -1;
    monthly.forEach((b, i) => {
      if (b.dlPD > 0 || b.idlPD > 0) lastWithData = i;
    });
    if (lastWithData < 0) return { labels: [], dlPct: [], idlPct: [] };

    const labels = MONTH_LABELS.slice(0, lastWithData + 1);
    const dlPct  = monthly.slice(0, lastWithData + 1).map(b =>
      b.dlPD  > 0 ? +(b.dlAbs  / b.dlPD  * 100).toFixed(1) : 0
    );
    const idlPct = monthly.slice(0, lastWithData + 1).map(b =>
      b.idlPD > 0 ? +(b.idlAbs / b.idlPD * 100).toFixed(1) : 0
    );
    return { labels, dlPct, idlPct };
  }, [yearStaffing, holidays]);

  const rangeLabel = endDate
    ? `Jan 1 — ${format(parseISO(endDate), 'MMM d')}, ${year}`
    : `${year}`;
  const scopeLabel = plantFilter || 'all plants';

  return (
    <div>
      <div className={styles.headerBar}>
        <span className={styles.yearLabel}>Year-to-Date · {year}</span>
        <span className={styles.rangeLabel}>{rangeLabel}</span>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading year-to-date data…</div>
      ) : rate.personDays === 0 && rate.idlPersonDays === 0 ? (
        <div className={styles.empty}>
          No headcount lines found in {year}'s Staffing Issues comments
          for {scopeLabel}. Add a line like <code>DL = 1st - 26, 2nd - 11</code>
          (or <code>DL = 23</code>) to enable percentage calculations.
        </div>
      ) : (
        <>
          {/* Header strip */}
          <div className={styles.rateHeader}>
            <div className={styles.rateHeaderText}>
              Year-to-date absenteeism rate — {scopeLabel}
              <span className={styles.rateDenominator}>
                {' '}({rate.combinedUnplanned} absences out of {rate.combinedShifts || '—'} shifts
                across {rate.daysCounted} day{rate.daysCounted !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Total Absenteeism — full-width headline over the DL/IDL split. */}
          <div className={styles.totalHero}>
            <div className={styles.totalHeroPct}>{rate.totalPct}</div>
            <div className={styles.totalHeroLabel}>Total Absenteeism</div>
            <div className={styles.totalHeroSub}>
              {rate.combinedUnplanned} of {rate.combinedShifts || '—'} shifts (DL + IDL)
            </div>
          </div>

          {/* Direct vs Indirect Labor breakdown. HR tracks UNPLANNED
              absenteeism, so each side shows the unplanned rate. */}
          <div className={styles.dlIdlHero}>
            <div className={styles.dlIdlHalf}>
              <div className={styles.dlIdlPct}>{rate.dlRatePct}</div>
              <div className={styles.dlIdlLabel}>Direct Labor</div>
              <div className={styles.dlIdlSub}>
                {rate.dlUnplanned} of {rate.personDays || '—'} shifts
              </div>
            </div>
            <div className={styles.dlIdlDivider} aria-hidden="true" />
            <div className={styles.dlIdlHalf}>
              <div className={styles.dlIdlPct}>{rate.idlRatePct}</div>
              <div className={styles.dlIdlLabel}>Indirect Labor</div>
              <div className={styles.dlIdlSub}>
                {rate.idlUnplanned} of {rate.idlPersonDays || '—'} shifts
              </div>
            </div>
          </div>

          {/* Monthly trend — DL and IDL on the same axes */}
          {trend.labels.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>
                Monthly Absenteeism % — Direct vs Indirect Labor
              </div>
              <div className={styles.cardBody}>
                <LineChart
                  datasets={[
                    { data: trend.dlPct,  color: '#1e40af', fill: false, label: 'DL'  },
                    { data: trend.idlPct, color: '#d97706', fill: false, label: 'IDL' },
                  ]}
                  labels={trend.labels}
                  options={{ height: 220 }}
                />
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#1e40af' }} />
                    Direct Labor
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#d97706' }} />
                    Indirect Labor
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
