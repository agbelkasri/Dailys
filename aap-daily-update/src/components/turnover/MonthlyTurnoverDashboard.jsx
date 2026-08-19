import { useState, useMemo } from 'react';
import { useTurnoverMonthly, useTurnoverBaseline } from '../../hooks/useTurnoverMonthly';
import { TURNOVER_CATEGORIES, MONTH_ABBR } from '../../constants/turnoverMonthly';
import { StatsCard, StatsGrid } from '../absentee/StatsCard';
import styles from './MonthlyTurnoverDashboard.module.css';

// "Total" pseudo-category plus the three real ones.
const VIEW_CATEGORIES = [{ id: 'total', label: 'Total' }, ...TURNOVER_CATEGORIES];

const CAT_IDS = ['salary', 'direct', 'indirect'];

function catCell(row, catId) {
  if (catId === 'total') {
    return CAT_IDS.reduce((acc, c) => {
      const cell = row[c] || {};
      acc.headcount += cell.headcount || 0;
      acc.terminations += cell.terminations || 0;
      return acc;
    }, { headcount: 0, terminations: 0 });
  }
  const cell = row[catId] || {};
  return { headcount: cell.headcount || 0, terminations: cell.terminations || 0 };
}

function baselineFor(baseline, catId) {
  if (!baseline) return 0;
  if (catId === 'total') return (baseline.salary || 0) + (baseline.direct || 0) + (baseline.indirect || 0);
  return baseline[catId] || 0;
}

const fmtPct = (num, den) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—');

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
    let ytdTerms = 0;
    return filled.map(r => {
      const { headcount, terminations } = catCell(r, category);
      ytdTerms += terminations;
      const monthIdx = Number(String(r.month).slice(5, 7)) - 1;
      return {
        month: r.month,
        label: MONTH_ABBR[monthIdx] || r.month,
        headcount,
        terminations,
        monthlyPct: fmtPct(terminations, headcount),
        ytdTerms,
        ytdPct: fmtPct(ytdTerms, base),
      };
    });
  }, [rows, category, base]);

  const last = table[table.length - 1];

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
          label={`YTD Turnover % (${year})`}
          value={last ? last.ytdPct : '—'}
          accent="#1a3a5c"
          sub={`${last ? last.ytdTerms : 0} terms vs ${base} baseline`}
        />
        <StatsCard label="YTD Terminations" value={last ? last.ytdTerms : 0} accent="#dc2626" />
        <StatsCard label={`${last ? last.label : '—'} Monthly %`} value={last ? last.monthlyPct : '—'} accent="#2563eb" />
        <StatsCard label="Baseline Headcount" value={base} accent="#16a34a" sub="Dec 2025" />
      </StatsGrid>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.left}>Month</th>
                <th>EOM HC</th>
                <th>Terms</th>
                <th>Monthly %</th>
                <th>YTD Terms</th>
                <th>YTD %</th>
              </tr>
            </thead>
            <tbody>
              {table.map(r => (
                <tr key={r.month}>
                  <td className={styles.left}>{r.label}</td>
                  <td>{r.headcount}</td>
                  <td>{r.terminations}</td>
                  <td>{r.monthlyPct}</td>
                  <td>{r.ytdTerms}</td>
                  <td className={styles.ytd}>{r.ytdPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.note}>
          Monthly % = terminations ÷ end-of-month headcount. YTD % = cumulative terminations ÷ Dec-2025 baseline headcount.
        </div>
      </div>
    </div>
  );
}
