import { getSectionsForPlant } from '../../constants/sections';
import { ReportSection, ReportSectionCard } from './ReportSection';
import styles from './DailyReport.module.css';

export function DailyReport({
  reportId, plantId, readOnly, sections, loading, error,
  presenceMap, onFocusSection, onBlurSection,
  // Change-request controls (all optional — fall through to a static
  // read-only banner if the parent doesn't pass them, e.g. a print view)
  canRequestEdit = false, editRequested = false, submitState = 'idle',
  onRequestEdit, onSubmitChanges, onCancelEdit,
}) {
  const sectionDefs = getSectionsForPlant(plantId);

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
    reportId,
    sectionDef,
    sectionData: sections[sectionDef.id],
    readOnly,
    presenceMap,
    onFocusSection,
    onBlurSection,
  });

  // Banner rendering. Three meaningful states for a historical report:
  //   1. canRequestEdit && readOnly      — locked, show "Request Edit Access"
  //   2. canRequestEdit && !readOnly     — unlocked via request, show
  //                                        "Submit Changes" + "Cancel"
  //   3. readOnly && !canRequestEdit     — fallback static read-only banner
  //                                        (e.g. parent didn't wire the
  //                                        change-request callbacks)
  // When the user already has full edit rights (today/yesterday/admin) no
  // banner renders.
  const submitting = submitState === 'submitting';
  const submitFailed = submitState === 'error';

  return (
    <div className={styles.wrapper}>
      {canRequestEdit && readOnly && (
        <div className={styles.readOnlyBanner}>
          <span>Viewing historical report — read only</span>
          <button
            type="button"
            className={styles.requestEditBtn}
            onClick={onRequestEdit}
          >
            Request Edit Access
          </button>
        </div>
      )}
      {canRequestEdit && editRequested && (
        <div className={`${styles.readOnlyBanner} ${styles.editingBanner}`}>
          <span>
            Editing this historical report — your changes will be submitted as
            an auto-approved change request.
          </span>
          <div className={styles.bannerActions}>
            <button
              type="button"
              className={styles.requestEditBtn}
              onClick={onSubmitChanges}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Changes'}
            </button>
            <button
              type="button"
              className={styles.cancelEditBtn}
              onClick={onCancelEdit}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
          {submitFailed && (
            <span className={styles.bannerError}>
              Couldn't log your change request — check your connection and try again.
            </span>
          )}
        </div>
      )}
      {readOnly && !canRequestEdit && (
        <div className={styles.readOnlyBanner}>
          <span>Viewing historical report — read only</span>
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
