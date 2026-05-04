import { getSectionsForPlant } from '../../constants/sections';
import { ReportSection, ReportSectionCard } from './ReportSection';
import styles from './DailyReport.module.css';

export function DailyReport({ reportId, plantId, readOnly, editableSectionIds, sections, loading, error, presenceMap, onFocusSection, onBlurSection }) {
  const sectionDefs = getSectionsForPlant(plantId);
  const editableSet = editableSectionIds || new Set();

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

  // A section is editable if the page is editable, OR if this user is an
  // explicit editor for that section's responsible-party on this date.
  const isSectionReadOnly = (sectionDef) =>
    readOnly && !editableSet.has(sectionDef.id);

  const sharedProps = (sectionDef) => ({
    key: sectionDef.id,
    reportId,
    sectionDef,
    sectionData: sections[sectionDef.id],
    readOnly: isSectionReadOnly(sectionDef),
    presenceMap,
    onFocusSection,
    onBlurSection,
  });

  // Build a friendly read-only banner. If the user has section-level edit
  // access on a historical day, surface which responsible-parties they can
  // still edit so they know why some rows are enabled and others aren't.
  const editableResponsibles = readOnly
    ? Array.from(new Set(
        sectionDefs
          .filter((s) => editableSet.has(s.id))
          .map((s) => s.responsible)
      ))
    : [];
  const hasPartialEdit = readOnly && editableResponsibles.length > 0;

  return (
    <div className={styles.wrapper}>
      {readOnly && !hasPartialEdit && (
        <div className={styles.readOnlyBanner}>
          Viewing historical report — read only
        </div>
      )}
      {hasPartialEdit && (
        <div className={styles.readOnlyBanner}>
          Viewing historical report — read only except for {editableResponsibles.join(' / ')} sections
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
            {sectionDefs.map((sectionDef) => (
              <ReportSection {...sharedProps(sectionDef)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className={styles.cardList}>
        {sectionDefs.map((sectionDef) => (
          <ReportSectionCard {...sharedProps(sectionDef)} />
        ))}
      </div>
    </div>
  );
}
