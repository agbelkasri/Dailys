import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useMonthlyTurnovers } from '../../hooks/useMonthlyTurnovers';
import { PLANTS, REASON_LABELS, TENURE_LABELS } from '../../constants/turnovers';
import { StatsCard, StatsGrid } from '../absentee/StatsCard';
import { CalendarHeatmap } from '../absentee/charts/CalendarHeatmap';
import { BarChart } from '../absentee/charts/BarChart';
import { DonutChart } from '../absentee/charts/DonutChart';
import { DayOfWeekChart } from '../absentee/charts/DayOfWeekChart';
import styles from './MonthlyView.module.css';

const PLANT_MAP = Object.fromEntries(PLANTS.map(p => [p.id, p.name]));

const REASON_COLORS = {
  resignation:     '#2563eb',
  retirement:      '#7c3aed',
  termination:     '#ef4444',
  job_abandonment: '#92400e',
  end_of_contract: '#06b6d4',
  layoff:          '#f59e0b',
  performance:     '#dc2626',
  other:           '#94a3b8',
};

const TENURE_COLORS = {
  under_3mo: '#ef4444',
  '3_6mo':   '#f97316',
  '6_12mo':  '#f59e0b',
  '1_2yr':   '#84cc16',
  '2_5yr':   '#22c55e',
  over_5yr:  '#16a34a',
};

export function MonthlyView({ plantFilter }) {
  const [refDate, setRefDate] = useState(() => new Date());
  const year  = refDate.getFullYear();
  const month = refDate.getMonth();

  const { turnovers: allTurnovers, loading, error } = useMonthlyTurnovers(year, month);

  const prevRef = subMonths(refDate, 1);
  const { turnovers: prevTurnovers } = useMonthlyTurnovers(prevRef.getFullYear(), prevRef.getMonth());

  const turnovers = useMemo(() =>
    plantFilter ? allTurnovers.filter(t => t.plantId === plantFilter) : allTurnovers,
    [allTurnovers, plantFilter]
  );

  const data = useMemo(() => {
    const total       = turnovers.length;
    const voluntary   = turnovers.filter(t => t.type === 'voluntary').length;
    const involuntary = turnovers.filter(t => t.type === 'involuntary').length;
    const direct      = turnovers.filter(t => (t.laborType || 'direct') === 'direct').length;
    const indirect    = turnovers.filter(t => t.laborType === 'indirect').length;
    const shift1      = turnovers.filter(t => (t.shift || '1st') === '1st').length;
    const shift2      = turnovers.filter(t => t.shift === '2nd').length;
    const fullTime    = turnovers.filter(t => (t.employmentType || 'full_time') === 'full_time').length;
    const partTime    = turnovers.filter(t => t.employmentType === 'part_time').length;
    const rehireYes   = turnovers.filter(t => t.rehireEligible === 'yes').length;
    const rehireNo    = turnovers.filter(t => t.rehireEligible === 'no').length;
    const rehireUnk   = turnovers.filter(t => !t.rehireEligible || t.rehireEligible === 'unknown').length;

    // By day (for calendar)
    const byDay = new Map();
    turnovers.forEach(t => {
      byDay.set(t.lastDay, (byDay.get(t.lastDay) || 0) + 1);
    });

    // Peak day
    let peakDay = '-'; let peakCount = 0;
    byDay.forEach((cnt, d) => { if (cnt > peakCount) { peakDay = d; peakCount = cnt; } });
    const peakLabel = peakCount > 0
      ? `${format(new Date(peakDay + 'T12:00:00'), 'MMM d')} (${peakCount})`
      : '-';

    // By reason
    const bReason = {};
    turnovers.forEach(t => { bReason[t.reason] = (bReason[t.reason] || 0) + 1; });
    let topReason = '-'; let topCount = 0;
    Object.entries(bReason).forEach(([r, c]) => { if (c > topCount) { topReason = r; topCount = c; } });

    // Month-over-month
    const prevTotal = (plantFilter ? prevTurnovers.filter(t => t.plantId === plantFilter) : prevTurnovers).length;
    let momLabel = '-';
    if (prevTotal > 0) {
      const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
      momLabel = `${pct > 0 ? '+' : ''}${pct}% vs last month`;
    }

    // Day of week
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    turnovers.forEach(t => {
      const idx = new Date(t.lastDay + 'T12:00:00').getDay();
      dowCounts[idx]++;
    });

    // Daily bar chart
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyBars = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayT = turnovers.filter(t => t.lastDay === dateStr);
      const v = dayT.filter(t => t.type === 'voluntary').length;
      const i = dayT.filter(t => t.type === 'involuntary').length;
      dailyBars.push({
        label: d % 5 === 1 || d === daysInMonth ? String(d) : '',
        segments: [
          { value: v, color: '#2563eb' },
          { value: i, color: '#ef4444' },
        ],
      });
    }

    // Reason segments
    const reasonSegments = Object.entries(bReason).map(([r, c]) => ({
      label: REASON_LABELS[r] || r,
      value: c,
      color: REASON_COLORS[r] || '#94a3b8',
    }));

    // Plant segments
    const byPlant = {};
    turnovers.forEach(t => { byPlant[t.plantId] = (byPlant[t.plantId] || 0) + 1; });
    const plantSegments = PLANTS
      .filter(p => byPlant[p.id])
      .map((p, i) => ({
        label: p.name,
        value: byPlant[p.id] || 0,
        color: ['#1a3a5c', '#2d6a9f', '#60a5fa'][i % 3],
      }));

    // Tenure segments
    const byTenure = {};
    turnovers.forEach(t => { byTenure[t.tenure] = (byTenure[t.tenure] || 0) + 1; });
    const tenureSegments = Object.entries(byTenure).map(([k, c]) => ({
      label: TENURE_LABELS[k] || k,
      value: c,
      color: TENURE_COLORS[k] || '#94a3b8',
    }));

    return {
      total, voluntary, involuntary, direct, indirect, shift1, shift2,
      fullTime, partTime, rehireYes, rehireNo, rehireUnk,
      peakLabel, momLabel,
      topReason: REASON_LABELS[topReason] || topReason,
      byDay, dowCounts, dailyBars,
      reasonSegments, plantSegments, tenureSegments,
    };
  }, [turnovers, prevTurnovers, year, month, plantFilter]);

  const monthLabel = format(refDate, 'MMMM yyyy');

  return (
    <div>
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
          <StatsGrid>
            <StatsCard label="Total Departures"  value={data.total}       accent="#1a3a5c" sub={data.momLabel} />
            <StatsCard label="Voluntary"         value={data.voluntary}   accent="#2563eb" />
            <StatsCard label="Involuntary"       value={data.involuntary} accent="#dc2626" />
            <StatsCard label="Direct Labor"      value={data.direct}      accent="#16a34a" />
            <StatsCard label="Indirect Labor"    value={data.indirect}    accent="#d97706" />
            <StatsCard label="1st Shift"         value={data.shift1}      accent="#0891b2" />
            <StatsCard label="2nd Shift"         value={data.shift2}      accent="#7c3aed" />
            <StatsCard label="Rehire Eligible"   value={data.rehireYes}   accent="#16a34a" />
            <StatsCard label="Peak Day"          value={data.peakLabel}   accent="#f59e0b" />
            <StatsCard label="Top Reason"        value={data.topReason}   accent="#ec4899" />
          </StatsGrid>

          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>Departure Calendar</div>
            <div className={styles.cardBody}>
              <CalendarHeatmap byDay={data.byDay} year={year} month={month} />
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Voluntary vs Involuntary</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: 'Voluntary',   value: data.voluntary,   color: '#2563eb' },
                    { label: 'Involuntary', value: data.involuntary, color: '#ef4444' },
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

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Full Time vs Part Time</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: 'Full Time', value: data.fullTime, color: '#0f766e' },
                    { label: 'Part Time', value: data.partTime, color: '#f59e0b' },
                  ]}
                  centerText={String(data.total)}
                />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>Eligible for Rehire</div>
              <div className={styles.cardBody}>
                <DonutChart
                  segments={[
                    { label: 'Yes',     value: data.rehireYes, color: '#16a34a' },
                    { label: 'No',      value: data.rehireNo,  color: '#dc2626' },
                    { label: 'Unknown', value: data.rehireUnk, color: '#94a3b8' },
                  ]}
                  centerText={String(data.total)}
                />
              </div>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>By Reason</div>
              <div className={styles.cardBody}>
                <DonutChart segments={data.reasonSegments} centerText={String(data.total)} />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>By Tenure</div>
              <div className={styles.cardBody}>
                <DonutChart segments={data.tenureSegments} centerText={String(data.total)} />
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>Daily Departures</div>
            <div className={styles.cardBody}>
              <BarChart data={data.dailyBars} options={{ stacked: true, showValues: false, height: 200 }} />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>Day of Week Distribution</div>
            <div className={styles.cardBody}>
              <DayOfWeekChart counts={data.dowCounts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
