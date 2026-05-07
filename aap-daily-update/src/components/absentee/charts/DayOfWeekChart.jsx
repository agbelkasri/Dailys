import styles from './Chart.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** counts: number[7] — one per day Sun=0..Sat=6 */
export function DayOfWeekChart({ counts }) {
  const max = Math.max(...counts, 1);
  const peakIdx = counts.indexOf(Math.max(...counts));

  return (
    <div className={styles.dowChart}>
      {counts.map((count, i) => (
        <div key={i} className={styles.dowCol}>
          <span className={styles.dowValue}>{count}</span>
          <div className={styles.dowBarTrack}>
            <div
              className={`${styles.dowBar} ${i === peakIdx && count > 0 ? styles.dowBarPeak : ''}`}
              style={{ height: `${(count / max) * 100}%` }}
            />
          </div>
          <span className={styles.dowLabel}>{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}
