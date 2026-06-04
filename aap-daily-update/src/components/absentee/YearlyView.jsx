import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useYearlyStaffing } from '../../hooks/useYearlyStaffing';
import { parseStaffingIssues, parseStaffingHeadcount } from '../../utils/parseStaffingIssues';
import { StatsCard, StatsGrid } from './StatsCard';
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

  // ── Aggregate scheduled shifts across the year ────────────────────────────
  // For each weekday with a headcount line, the DL/IDL roster count contributes
  // that many "scheduled shifts" (one worker × one shift per day). Absences
  // are subtracted from those scheduled shifts to get the unfulfilled count.
  const rate = useMemo(() => {
    let dlPlanned = 0, dlUnplanned = 0, dlPersonDays = 0, dlDaysCounted = 0;
    let idlPlanned = 0, idlUnplanned = 0, idlPersonDays = 0;

    for (const entry of Object.values(yearStaffing)) {
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

    return {
      personDays:    dlPersonDays,
      idlPersonDays,
      daysCounted:   dlDaysCounted,
      dlPlanned, dlUnplanned, dlTotal,
      idlPlanned, idlUnplanned, idlTotal,
      totalPct:     pct(dlTotal),
      plannedPct:   pct(dlPlanned),
      unplannedPct: pct(dlUnplanned),
      dlRatePct:    pct(dlTotal),
      idlRatePct:   ipct(idlTotal),
    };
  }, [yearStaffing]);

  // ── Per-month breakdown — for the trend chart ────────────────────────────
  // Bucket every day by month, aggregate the same way, then compute each
  // month's DL and IDL absenteeism % as separate datasets.
  const trend = useMemo(() => {
    const monthly = Array.from({ length: 12 }, () => ({
      dlAbs: 0, dlPD: 0, idlAbs: 0, idlPD: 0,
    }));

    for (const entry of Object.values(yearStaffing)) {
      const text = entry?.comments;
      if (!text) continue;
      const hc = parseStaffingHeadcount(text);
      if (!hc) continue;

      const monthIdx = parseInt(entry.date.slice(5, 7), 10) - 1;
      const bucket = monthly[monthIdx];
      const parsed = parseStaffingIssues(text, { plantId: entry.plantId, date: entry.date });

      if (hc.DL_total != null) {
        bucket.dlPD += hc.DL_total;
        bucket.dlAbs += parsed.filter(a => a.laborType === 'direct').length;
      }
      if (hc.IDL_total != null) {
        bucket.idlPD += hc.IDL_total;
        bucket.idlAbs += parsed.filter(a => a.laborType === 'indirect').length;
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
  }, [yearStaffing]);

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
                {' '}({rate.dlTotal} absences out of {rate.personDays || '—'} shifts
                across {rate.daysCounted} day{rate.daysCounted !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Direct vs Indirect Labor — headline card */}
          <div className={styles.dlIdlHero}>
            <div className={styles.dlIdlHalf}>
              <div className={styles.dlIdlPct}>{rate.dlRatePct}</div>
              <div className={styles.dlIdlLabel}>Direct Labor</div>
              <div className={styles.dlIdlSub}>
                {rate.dlTotal} absences out of {rate.personDays || '—'} shifts
              </div>
            </div>
            <div className={styles.dlIdlDivider} aria-hidden="true" />
            <div className={styles.dlIdlHalf}>
              <div className={styles.dlIdlPct}>{rate.idlRatePct}</div>
              <div className={styles.dlIdlLabel}>Indirect Labor</div>
              <div className={styles.dlIdlSub}>
                {rate.idlTotal} absences out of {rate.idlPersonDays || '—'} shifts
              </div>
            </div>
          </div>

          {/* Total / Planned / Unplanned (DL-relative) */}
          <StatsGrid>
            <StatsCard
              label="Total Absenteeism %"
              value={rate.totalPct}
              sub={`${rate.dlTotal} absences out of ${rate.personDays || '—'} shifts`}
              accent="#1a3a5c"
            />
            <StatsCard
              label="Planned %"
              value={rate.plannedPct}
              sub={`${rate.dlPlanned} absences out of ${rate.personDays || '—'} shifts`}
              accent="#2563eb"
            />
            <StatsCard
              label="Unplanned %"
              value={rate.unplannedPct}
              sub={`${rate.dlUnplanned} absences out of ${rate.personDays || '—'} shifts`}
              accent="#dc2626"
            />
          </StatsGrid>

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
