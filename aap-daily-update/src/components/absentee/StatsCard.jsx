import styles from './StatsCard.module.css';

export function StatsCard({ label, value, sub, accent }) {
  return (
    <div className={styles.card} style={accent ? { borderTopColor: accent } : undefined}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}

export function StatsGrid({ children }) {
  return <div className={styles.grid}>{children}</div>;
}
