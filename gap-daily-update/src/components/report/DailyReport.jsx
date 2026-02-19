import { SECTIONS } from '../../constants/sections';
import { ReportSection, ReportSectionCard } from './ReportSection';
import styles from './DailyReport.module.css';

export function DailyReport({ date, readOnly, sections, loading, error, presenceMap, onFocusSection, onBlurSection }) {

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading report...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading} style={{ color: '#c0392b', flexDirection: 'column', gap: '8px' }}>
        <strong>Failed to load report</strong>
        <span style={{ fontSize: '13px', opacity: 0.8 }}>{error}</span>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>Check your connection and try refreshing the page.</span>
      </div>
    );
  }

  const sharedProps = (sectionDef) => ({
    key: sectionDef.id,
    date,
    sectionDef,
    sectionData: sections[sectionDef.id],
    readOnly,
    presenceMap,
    onFocusSection,
    onBlurSection,
  });

  return (
    <div className={styles.wrapper}>
      {readOnly && (
        <div className={styles.readOnlyBanner}>
          Viewing historical report — read only
        </div>
      )}

      {/* Desktop: table layout */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thResponsible}>Responsible Party</th>
              <th className={styles.thMeasurable}>Measurable</th>
              <th className={styles.thStatus}>Status</th>
              <th className={styles.thContent}>Comments / Explanation</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sectionDef) => (
              <ReportSection {...sharedProps(sectionDef)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className={styles.cardList}>
        {SECTIONS.map((sectionDef) => (
          <ReportSectionCard {...sharedProps(sectionDef)} />
        ))}
      </div>
    </div>
  );
}
