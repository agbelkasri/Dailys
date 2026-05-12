import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAbsencesInRange } from '../../hooks/useAbsencesInRange';
import { PLANTS, REASON_LABELS } from '../../constants/absences';
import { StatsCard, StatsGrid } from './StatsCard';
import { DonutChart } from './charts/DonutChart';
import { LineChart } from './charts/LineChart';
import styles from './OverviewView.module.css';

const PLANT_COLORS = { EAP: '#0284c7', GAP: '#1a4a8c', SLP: '#1a3a5c' };
const DOW_NAMES    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/**
 * Owner Overview — high-level, percentage-focused snapshot of absences.
 * Designed to be glanceable: the unplanned rate is the headline number,
 * everything below contextualizes it (trend, top reasons, plant share).
 *
 * All ratios are pool percentages — % of the absences themselves, not %
 * of the workforce. The app doesn't track headcount yet, so "absence
 * rate of the labor force" isn't computable. That can be added later by
 * dropping a headcount table in Firestore and dividing through here.
 */
export function OverviewView({ plantFilter }) {
  const [refDate, setRefDate] = useState(() => new Date());

  // One 6-month range query feeds both the trend chart and the
  // current-month aggregates — single subscription, no fan-out.
  const trendStart = format(startOfMonth(subMonths(refDate, 5)), 'yyyy-MM-dd');
  const trendEnd   = format(endOfMonth(refDate),                'yyyy-MM-dd');
  const { absences: rangeAbsences, loading, error } = useAbsencesInRange(trendStart, trendEnd);

  // Apply plant filter once, then derive everything else
  const filtered = useMemo(
    () => plantFilter ? rangeAbsences.filter(a => a.plantId === plantFilter) : rangeAbsences,
    [rangeAbsences, plantFilter]
  );

  const data = useMemo(() => {
    const currentMonthStr = format(refDate, 'yyyy-MM');
    const currentMonth = filtered.filter(a => a.date.startsWith(currentMonthStr));
    const prevMonthStr = format(subMonths(refDate, 1), 'yyyy-MM');
    const prevMonth    = filtered.filter(a => a.date.startsWith(prevMonthStr));

    const total     = currentMonth.length;
    const prevTotal = prevMonth.length;
    const planned   = currentMonth.filter(a => a.type === 'planned').length;
    const unplanned = currentMonth.filter(a => a.type === 'unplanned').length;
    const direct    = currentMonth.filter(a => (a.laborType || 'direct') === 'direct').length;
    const longTerm  = currentMonth.filter(a => a.absenceTerm === 'long_term').length;
    const fullTime  = currentMonth.filter(a => (a.employmentType || 'full_time') === 'full_time').length;
    const totalHrs  = currentMonth.reduce((s, a) => s + (a.durationHours || 0), 0);

    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

    // Month-over-month delta on unplanned share, the headline KPI.
    const prevUnplanned = prevMonth.filter(a => a.type === 'unplanned').length;
    const prevUnplannedPct = prevTotal > 0 ? Math.round((prevUnplanned / prevTotal) * 100) : null;
    const unplannedPct = pct(unplanned);
    const unplannedDeltaPts = prevUnplannedPct == null ? null : unplannedPct - prevUnplannedPct;

    // Plant share (only meaningful when no plant filter is applied)
    const byPlant = {};
    currentMonth.forEach(a => { byPlant[a.plantId] = (byPlant[a.plantId] || 0) + 1; });
    const plantShares = PLANTS
      .map(p => ({
        id:    p.id,
        label: p.name,
        count: byPlant[p.id] || 0,
        pct:   pct(byPlant[p.id] || 0),
        color: PLANT_COLORS[p.id] || '#64748b',
      }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);

    // Top reasons — show all that have at least one absence, ranked.
    const byReason = {};
    currentMonth.forEach(a => { byReason[a.reason] = (byReason[a.reason] || 0) + 1; });
    const reasonRows = Object.entries(byReason)
      .map(([r, c]) => ({ key: r, label: REASON_LABELS[r] || r, count: c, pct: pct(c) }))
      .sort((a, b) => b.count - a.count);

    // Day-of-week distribution (for the "Mondays are X%" insight)
    const dowCounts = [0,0,0,0,0,0,0];
    currentMonth.forEach(a => {
      const d = new Date(a.date + 'T12:00:00').getDay();
      dowCounts[d]++;
    });
    let peakDow = -1, peakDowCount = 0;
    dowCounts.forEach((c, i) => { if (c > peakDowCount) { peakDow = i; peakDowCount = c; } });
    const peakDowPct = pct(peakDowCount);

    // 6-month trend totals — bucket the range query by YYYY-MM.
    const trendLabels = [];
    const trendTotals = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(refDate, i);
      const ms = format(m, 'yyyy-MM');
      trendLabels.push(format(m, 'MMM'));
      trendTotals.push(filtered.filter(a => a.date.startsWith(ms)).length);
    }

    return {
      total, prevTotal,
      planned, unplanned, plannedPct: pct(planned), unplannedPct,
      direct, directPct: pct(direct),
      longTerm, longTermPct: pct(longTerm),
      fullTime, fullTimePct: pct(fullTime),
      totalHrs,
      unplannedDeltaPts,
      plantShares,
      reasonRows,
      topReason: reasonRows[0] || null,
      peakDow, peakDowCount, peakDowPct,
      trendLabels, trendTotals,
    };
  }, [filtered, refDate]);

  const monthLabel = format(refDate, 'MMMM yyyy');
  const showPlantBreakdown = !plantFilter && data.plantShares.length > 0;

  return (
    <div>
      {/* Month navigation — same affordance as MonthlyView */}
      <div className={styles.monthBar}>
        <button
          className={styles.navBtn}
          onClick={() => setRefDate(d => subMonths(d, 1))}
          aria-label="Previous month"
        >‹</button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button
          className={styles.navBtn}
          onClick={() => setRefDate(d => addMonths(d, 1))}
          disabled={format(addMonths(refDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
          aria-label="Next month"
        >›</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : error ? (
        <div className={styles.errorMsg}>{error}</div>
      ) : data.total === 0 ? (
        <div className={styles.empty}>
          No absences recorded for {monthLabel}{plantFilter ? ` at ${plantFilter}` : ''}.
        </div>
      ) : (
        <>
          {/* ───────────── HERO: Unplanned rate ───────────── */}
          <div className={styles.hero}>
            <div className={styles.heroMain}>
              <div className={styles.heroPct}>{data.unplannedPct}%</div>
              <div className={styles.heroLabel}>Unplanned absences</div>
              <div className={styles.heroSub}>
                {data.unplanned} of {data.total} absences this month were unplanned
              </div>
              {data.unplannedDeltaPts != null && (
                <div className={
                  data.unplannedDeltaPts > 0 ? styles.deltaUp
                  : data.unplannedDeltaPts < 0 ? styles.deltaDown
                  : styles.deltaFlat
                }>
                  {data.unplannedDeltaPts > 0 ? '▲' : data.unplannedDeltaPts < 0 ? '▼' : '◆'}
                  {' '}{Math.abs(data.unplannedDeltaPts)} pts vs last month
                </div>
              )}
            </div>
            <div className={styles.heroChart}>
              <DonutChart
                segments={[
                  { label: 'Planned',   value: data.planned,   color: '#2563eb' },
                  { label: 'Unplanned', value: data.unplanned, color: '#ef4444' },
                ]}
                size={170}
                lineWidth={28}
              />
            </div>
          </div>

          {/* ───────────── KPI strip ───────────── */}
          <StatsGrid>
            <StatsCard
              label="Direct Labor"
              value={`${data.directPct}%`}
              sub={`${data.direct} of ${data.total} absences`}
              accent="#16a34a"
            />
            <StatsCard
              label="Long-Term"
              value={`${data.longTermPct}%`}
              sub={`${data.longTerm} of ${data.total} absences`}
              accent="#dc2626"
            />
            <StatsCard
              label="Full-Time"
              value={`${data.fullTimePct}%`}
              sub={`${data.fullTime} of ${data.total} absences`}
              accent="#0f766e"
            />
            <StatsCard
              label="Hours Lost"
              value={data.totalHrs.toLocaleString()}
              sub="Total hours this month"
              accent="#f59e0b"
            />
          </StatsGrid>

          {/* ───────────── Top reasons ───────────── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Top Reasons</div>
            <div className={styles.bars}>
              {data.reasonRows.slice(0, 6).map((r) => (
                <div key={r.key} className={styles.barRow}>
                  <div className={styles.barLabel}>{r.label}</div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${r.pct}%`, background: '#2563eb' }}
                    />
                  </div>
                  <div className={styles.barValue}>{r.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* ───────────── Plant comparison ───────────── */}
          {showPlantBreakdown && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Share by Plant</div>
              <div className={styles.bars}>
                {data.plantShares.map((p) => (
                  <div key={p.id} className={styles.barRow}>
                    <div className={styles.barLabel}>{p.label}</div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${p.pct}%`, background: p.color }}
                      />
                    </div>
                    <div className={styles.barValue}>{p.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────── 6-month trend ───────────── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>6-Month Trend</div>
            <div className={styles.trendWrap}>
              <LineChart
                datasets={[{
                  data: data.trendTotals,
                  color: '#0284c7',
                  fill: true,
                  fillColor: 'rgba(2, 132, 199, 0.18)',
                }]}
                labels={data.trendLabels}
                options={{ height: 200 }}
              />
            </div>
          </div>

          {/* ───────────── Auto-generated insights ───────────── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>At a glance</div>
            <ul className={styles.insights}>
              <li>
                <strong>{data.unplannedPct}%</strong> of absences this month were{' '}
                <strong>unplanned</strong>.
              </li>
              {data.topReason && (
                <li>
                  Top reason: <strong>{data.topReason.label}</strong> —{' '}
                  <strong>{data.topReason.pct}%</strong> of all absences
                  ({data.topReason.count} of {data.total}).
                </li>
              )}
              {data.peakDow >= 0 && data.peakDowCount > 0 && (
                <li>
                  <strong>{DOW_NAMES[data.peakDow]}s</strong> account for{' '}
                  <strong>{data.peakDowPct}%</strong> of absences
                  ({data.peakDowCount} of {data.total}).
                </li>
              )}
              {showPlantBreakdown && data.plantShares.length > 1 && (
                <li>
                  <strong>{data.plantShares[0].label}</strong> has the highest
                  share at <strong>{data.plantShares[0].pct}%</strong>.
                </li>
              )}
              <li>
                <strong>{data.directPct}%</strong> of absences came from{' '}
                <strong>direct labor</strong> — the workforce closest to production.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
