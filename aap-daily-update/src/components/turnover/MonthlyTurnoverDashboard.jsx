import { useState, useMemo } from 'react';
import { useTurnoverMonthly, useTurnoverBaseline } from '../../hooks/useTurnoverMonthly';
import { TURNOVER_CATEGORIES, MONTH_ABBR } from '../../constants/turnoverMonthly';
import { StatsCard, StatsGrid } from '../absentee/StatsCard';
import { DonutChart } from '../absentee/charts/DonutChart';
import styles from './MonthlyTurnoverDashboard.module.css';

// "Total" pseudo-category plus the three real ones.
const VIEW_CATEGORIES = [{ id: 'total', label: 'Total' }, ...TURNOVER_CATEGORIES];

const CAT_IDS = ['salary', 'direct', 'indirect'];
const VOL_COLOR = '#2563eb';
const INVOL_COLOR = '#dc2626';

// Normalize a stored category cell into counts. Handles the current shape
// ({headcount, voluntary, involuntary}) and the older single-count shape
// ({headcount, terminations}) that pre-Vol/Invol imports produced.
function cellVals(cell) {
  const headcount = cell.headcount || 0;
  const hasSplit = cell.voluntary != null || cell.involuntary != null;
  const voluntary = cell.voluntary || 0;
  const involuntary = cell.involuntary || 0;
  const terminations = hasSplit ? voluntary + involuntary : (cell.terminations || 0);
  return { headcount, voluntary, involuntary, terminations };
}

function catCell(row, catId) {
  if (catId === 'total') {
    return CAT_IDS.reduce((acc, c) => {
      const v = cellVals(row[c] || {});
      acc.headcount += v.headcount;
      acc.voluntary += v.voluntary;
      acc.involuntary += v.involuntary;
      acc.terminations += v.terminations;
      return acc;
    }, { headcount: 0, voluntary: 0, involuntary: 0, terminations: 0 });
  }
  return cellVals(row[catId] || {});
}

function baselineFor(baseline, catId) {
  if (!baseline) return 0;
  if (catId === 'total') return (baseline.salary || 0) + (baseline.direct || 0) + (baseline.indirect || 0);
  return baseline[catId] || 0;
}

const fmtPct = (num, den) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—');
const fmtDelta = (n) => (n == null ? '—' : n > 0 ? `+${n}` : String(n));

export function MonthlyTurnoverDashboard({ plantId, year }) {
  const [category, setCategory] = useState('total');
  const { rows, loading, error } = useTurnoverMonthly(plantId, year);
  const baseline = useTurnoverBaseline(plantId);

  const base = baselineFor(baseline, category);

  const table = useMemo(() => {
    // The Excel carries all 12 months, so unfilled future months import as
    // 0 headcount / 0 terms. Drop them so the table and the "latest month"
    // card reflect the last month with real data — not an empty December.
    const filled = rows.filter(r => {
      const t = catCell(r, 'total');
      return t.headcount > 0 || t.terminations > 0;
    });
    let ytdVol = 0, ytdInvol = 0, ytdTerms = 0;
    // Headcount Change is month-over-month; the first month compares to the
    // Dec-2025 baseline (null if we have no baseline to compare against).
    let prevHc = base > 0 ? base : null;
    return filled.map(r => {
      const { headcount, voluntary, involuntary, terminations } = catCell(r, category);
      ytdVol += voluntary;
      ytdInvol += involuntary;
      ytdTerms += terminations;
      const hcChange = prevHc == null ? null : headcount - prevHc;
      prevHc = headcount;
      const monthIdx = Number(String(r.month).slice(5, 7)) - 1;
      return {
        month: r.month,
        label: MONTH_ABBR[monthIdx] || r.month,
        headcount,
        hcChange,
        voluntary,
        involuntary,
        terminations,
        turnoverRate: fmtPct(terminations, headcount),
        ytdVol,
        ytdInvol,
        ytdTerms,
        ytdRate: fmtPct(ytdTerms, base),
      };
    });
  }, [rows, category, base]);

  const last = table[table.length - 1];
  const netChange = last && base > 0 ? last.headcount - base : null;

  if (loading) return <div className={styles.state}>Loading…</div>;
  if (error)   return <div className={styles.stateError}>{error}</div>;
  if (!rows.length) {
    return (
      <div className={styles.state}>
        No turnover data for <strong>{plantId}</strong> in {year}. Use <strong>Import Excel</strong> to load your tracker.
      </div>
    );
  }

  return (
    <div>
      <div className={styles.catTabs}>
        {VIEW_CATEGORIES.map(c => (
          <button
            key={c.id}
            className={category === c.id ? styles.catActive : styles.cat}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <StatsGrid>
        <StatsCard
          label={`YTD Turnover Rate (${year})`}
          value={last ? last.ytdRate : '—'}
          accent="#1a3a5c"
          sub={`${last ? last.ytdTerms : 0} terminations vs ${base} baseline`}
        />
        <StatsCard label="YTD Voluntary" value={last ? last.ytdVol : 0} accent={VOL_COLOR} />
        <StatsCard label="YTD Involuntary" value={last ? last.ytdInvol : 0} accent={INVOL_COLOR} />
        <StatsCard label={`${last ? last.label : '—'} Turnover Rate`} value={last ? last.turnoverRate : '—'} accent="#0891b2" />
        <StatsCard label="Baseline Headcount" value={base} accent="#16a34a" sub="Dec 2025" />
        <StatsCard
          label="Net Change (YTD)"
          value={fmtDelta(netChange)}
          accent={netChange > 0 ? '#16a34a' : netChange < 0 ? '#dc2626' : '#64748b'}
          sub="vs Dec 2025 baseline"
        />
      </StatsGrid>

      {/* Voluntary vs Involuntary breakdown (year to date) */}
      <div className={styles.tableCard}>
        <div className={styles.cardHeader}>Voluntary vs Involuntary — Year to Date</div>
        <div className={styles.donutBody}>
          <DonutChart
            segments={[
              { label: 'Voluntary',   value: last ? last.ytdVol : 0,   color: VOL_COLOR },
              { label: 'Involuntary', value: last ? last.ytdInvol : 0, color: INVOL_COLOR },
            ]}
            centerText={String(last ? last.ytdTerms : 0)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.left}>Month</th>
                <th>End of Month Headcount</th>
                <th>Headcount Change</th>
                <th>Voluntary</th>
                <th>Involuntary</th>
                <th>Terminations</th>
                <th>Turnover Rate</th>
                <th>YTD Terminations</th>
                <th>YTD Turnover Rate</th>
              </tr>
            </thead>
            <tbody>
              {table.map(r => (
                <tr key={r.month}>
                  <td className={styles.left}>{r.label}</td>
                  <td>{r.headcount}</td>
                  <td className={r.hcChange > 0 ? styles.up : r.hcChange < 0 ? styles.down : undefined}>
                    {fmtDelta(r.hcChange)}
                  </td>
                  <td>{r.voluntary}</td>
                  <td>{r.involuntary}</td>
                  <td>{r.terminations}</td>
                  <td>{r.turnoverRate}</td>
                  <td>{r.ytdTerms}</td>
                  <td className={styles.ytd}>{r.ytdRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.note}>
          Turnover Rate = terminations (voluntary + involuntary) ÷ end-of-month headcount.
          YTD Turnover Rate = cumulative terminations ÷ Dec-2025 baseline headcount.
          Headcount Change = net change vs the prior month (the first month is compared to the
          Dec-2025 baseline).
        </div>
      </div>
    </div>
  );
}
