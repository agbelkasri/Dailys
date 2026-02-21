import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useMonthlyAbsences } from '../../hooks/useMonthlyAbsences';
import { PLANTS, REASON_LABELS } from '../../constants/absences';
import { StatsCard, StatsGrid } from './StatsCard';
import { CalendarHeatmap } from './charts/CalendarHeatmap';
import { BarChart } from './charts/BarChart';
import { DonutChart } from './charts/DonutChart';
import { LineChart } from './charts/LineChart';
import { DayOfWeekChart } from './charts/DayOfWeekChart';
import styles from './MonthlyView.module.css';

const PLANT_MAP = Object.fromEntries(PLANTS.map(p => [p.id, p.name]));

const REASON_COLORS = {
  vacation: '#2563eb', sick: '#ef4444', personal: '#f59e0b',
  family_emergency: '#8b5cf6', jury_duty: '#06b6d4',
  bereavement: '#64748b', fmla: '#ec4899', work_injury: '#dc2626',
  no_call_no_show: '#92400e', other: '#94a3b8',
};

function getWorkingDays(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function MonthlyView({ plantFilter }) {
  const [refDate, setRefDate] = useState(() => new Date());
  const year  = refDate.getFullYear();
  const month = refDate.getMonth();

  const { absences: allAbsences, loading, error } = useMonthlyAbsences(year, month);

  // Previous month for trend comparison
  const prevRef = subMonths(refDate, 1);
  const { absences: prevAbsences } = useMonthlyAbsences(prevRef.getFullYear(), prevRef.getMonth());

  // Apply plant filter
  const absences = useMemo(() =>
    plantFilter ? allAbsences.filter(a => a.plantId === plantFilter) : allAbsences,
    [allAbsences, plantFilter]
  );

  // Aggregate data
  const data = useMemo(() => {
    const total     = absences.length;
    const planned   = absences.filter(a => a.type === 'planned').length;
    const unplanned = absences.filter(a => a.type === 'unplanned').length;
    const direct    = absences.filter(a => (a.laborType || 'direct') === 'direct').length;
    const indirect  = absences.filter(a => a.laborType === 'indirect').length;
    const shift1    = absences.filter(a => (a.shift || '1st') === '1st').length;
    const shift2    = absences.filter(a => a.shift === '2nd').length;
    const workDays  = getWorkingDays(year, month);
    const avgPerDay = workDays > 0 ? (total / workDays).toFixed(1) : '0';
    const totalHours = absences.reduce((s, a) => s + (a.durationHours || 0), 0);

    // By day (for calendar)
    const byDay = new Map();
    absences.forEach(a => {
      byDay.set(a.date, (byDay.get(a.date) || 0) + 1);
    });

    // Peak day
    let peakDay = '-'; let peakCount = 0;
    byDay.forEach((cnt, d) => { if (cnt > peakCount) { peakDay = d; peakCount = cnt; } });
    const peakLabel = peakCount > 0 ? `${format(new Date(peakDay + 'T12:00:00'), 'MMM d')} (${peakCount})` : '-';

    // By reason
    const bReason = {};
    absences.forEach(a => { bReason[a.reason] = (bReason[a.reason] || 0) + 1; });
    let topReason = '-';
    let topCount  = 0;
    Object.entries(bReason).forEach(([r, c]) => { if (c > topCount) { topReason = r; topCount = c; } });

    // Month-over-month
    const prevTotal = (plantFilter ? prevAbsences.filter(a => a.plantId === plantFilter) : prevAbsences).length;
    let momLabel = '-';
    if (prevTotal > 0) {
      const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
      momLabel = `${pct > 0 ? '+' : ''}${pct}% vs last month`;
    }

    // Day of week counts (0=Sun..6=Sat)
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    absences.forEach(a => {
      const idx = new Date(a.date + 'T12:00:00').getDay();
      dowCounts[idx]++;
    });

    // Plant breakdown for horizontal bar chart
    const byPlant = {};
    absences.forEach(a => { byPlant[a.plantId] = (byPlant[a.plantId] || 0) + 1; });

    // 6-month trend (for current + 5 previous months)
    const trendLabels = [];
    const trendData   = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(refDate, i);
      trendLabels.push(format(m, 'MMM'));
      trendData.push(0); // placeholder; real data needs separate hook per month
    }

    // Daily bar chart data
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyBars = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayAbs = absences.filter(a => a.date === dateStr);
      const p = dayAbs.filter(a => a.type === 'planned').length;
      const u = dayAbs.filter(a => a.type === 'unplanned').length;
      dailyBars.push({
        label: d % 5 === 1 || d === daysInMonth ? String(d) : '',
        segments: [
          { value: p, color: '#2563eb' },
          { value: u, color: '#ef4444' },
        ],
      });
    }

    // Top absentees
    const empCounts = {};
    absences.forEach(a => { empCounts[a.employeeName] = (empCounts[a.employeeName] || 0) + 1; });
    const topAbsentees = Object.entries(empCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Reason segments for donut
    const reasonSegments = Object.entries(bReason).map(([r, c]) => ({
      label: REASON_LABELS[r] || r,
      value: c,
      color: REASON_COLORS[r] || '#94a3b8',
    }));

    // Plant segments for donut
    const plantSegments = PLANTS
      .filter(p => byPlant[p.id])
      .map((p, i) => ({
        label: p.name,
        value: byPlant[p.id] || 0,
        color: ['#1a3a5c', '#2d6a9f', '#60a5fa'][i % 3],
      }));

    return {
      total, planned, unplanned, direct, indirect, shift1, shift2,
      avgPerDay, totalHours, peakLabel, momLabel,
      topReason: REASON_LABELS[topReason] || topReason,
      byDay, dowCounts, dailyBars, topAbsentees,
      reasonSegments, plantSegments,
    };
  }, [absences, prevAbsences, year, month, plantFilter]);

  const monthLabel = format(refDate, 'MMMM yyyy');

  // 6-month trend line — use monthly totals from absences data grouped by month
  const trendLabels = [];
  for (let i = 5; i >= 0; i--) {
    trendLabels.push(format(subMonths(refDate, i), 'MMM'));
  }

  return (
    <div>
      {/* Month nav */}
      <div className={styles.monthBar}>
        <button className={styles.navBtn} onClick={() => setRefDate(d => subMonths(d, 1))}>‹</button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button
          className={styles.navBtn}
          onClick={() => setRefDate(d => addMonths(d, 1))}
          disabled={format(addMonths(refDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
        >›</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : error ? (
        <div className={styles.errorMsg}>{error}</div>
      ) : (
        <>
          {/* Stats */}
          <StatsGrid>
            <StatsCard label="Total Absences" value={data.total}     accent="#1a3a5c" sub={data.momLabel} />
            <StatsCard label="Planned"        value={data.planned}   accent="#2563eb" />
            <StatsCard label="Unplanned"      value={data.unplanned} accent="#dc2626" />
            <StatsCard label="Direct Labor"   value={data.direct}    accent="#16a34a" />
            <StatsCard label="Indirect Labor" value={data.indirect}  accent="#d97706" />
            <StatsCard label="1st Shift"      value={data.shift1}    accent="#0891b2" />
            <StatsCard label="2nd Shift"      value={data.shift2}    accent="#7c3aed" />
            <StatsCard label="Avg / Work Day" value={data.avgPerDay} accent="#64748b" />
            <StatsCard label="Peak Day"       value={data.peakLabel} accent="#f59e0b" />
            <StatsCard label="Top Reason"     value={data.topReason} accent="#ec4899" />
          </StatsGrid>

          {/* Calendar */}
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>Absence Calendar</div>
            <div className={styles.cardBody}>
              <CalendarHeatmap byDay={data.byDay} year={year} month={month} />
            </div>
          </div>

          {/* Two-column charts */}
          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Planned vs Unplanned</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: 'Planned',   value: data.planned,   color: '#2563eb' },
                    { label: 'Unplanned', value: data.unplanned, color: '#ef4444' },
                  ]}
                  centerText={String(data.total)}
                />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>By Plant</div>
              <div className={styles.cardBody}>
                <DonutChart segments={data.plantSegments} centerText={String(data.total)} />
              </div>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Direct vs Indirect Labor</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: 'Direct',   value: data.direct,   color: '#1e40af' },
                    { label: 'Indirect', value: data.indirect, color: '#d97706' },
                  ]}
                  centerText={String(data.total)}
                />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>1st Shift vs 2nd Shift</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: '1st Shift', value: data.shift1, color: '#065f46' },
                    { label: '2nd Shift', value: data.shift2, color: '#7c3aed' },
                  ]}
                  centerText={String(data.total)}
                />
              </div>
            </div>
          </div>

          {/* By reason donut */}
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>By Reason</div>
            <div className={styles.cardBody}>
              <DonutChart segments={data.reasonSegments} centerText={String(data.total)} />
            </div>
          </div>

          {/* Daily bar chart */}
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>Daily Absences</div>
            <div className={styles.cardBody}>
              <BarChart data={data.dailyBars} options={{ stacked: true, showValues: false, height: 200 }} />
            </div>
          </div>

          {/* Day of week + Top absentees */}
          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Day of Week Distribution</div>
              <div className={styles.cardBody}>
                <DayOfWeekChart counts={data.dowCounts} />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Top Absentees</div>
              <div className={styles.cardBody}>
                {data.topAbsentees.length === 0 ? (
                  <div className={styles.noData}>No data</div>
                ) : (
                  <div className={styles.topList}>
                    {data.topAbsentees.map(([name, count], i) => (
                      <div key={name} className={styles.topItem}>
                        <span className={styles.topRank}>{i + 1}.</span>
                        <span className={styles.topName}>{name}</span>
                        <span className={styles.topCount}>{count} absence{count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
