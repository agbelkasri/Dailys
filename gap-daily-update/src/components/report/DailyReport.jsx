import { SECTIONS } from '../../constants/sections';
import { useReport } from '../../hooks/useReport';
import { ReportSection } from './ReportSection';
import styles from './DailyReport.module.css';

export function DailyReport({ date, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const { sections, loading } = useReport(date);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading report...
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {readOnly && (
        <div className={styles.readOnlyBanner}>
          Viewing historical report — read only
        </div>
      )}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thResponsible}>Responsible Party</th>
              <th className={styles.thMeasurable}>Measurable</th>
              <th className={styles.thStatus}>Status G/Y/R</th>
              <th className={styles.thContent}>Comments / Explanation</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sectionDef) => (
              <ReportSection
                key={sectionDef.id}
                date={date}
                sectionDef={sectionDef}
                sectionData={sections[sectionDef.id]}
                readOnly={readOnly}
                presenceMap={presenceMap}
                onFocusSection={onFocusSection}
                onBlurSection={onBlurSection}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
