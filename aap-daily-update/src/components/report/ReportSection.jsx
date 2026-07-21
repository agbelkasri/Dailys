import { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { SECTION_TYPES } from '../../constants/sections';
import { STATUS_COLORS } from '../../constants/colors';
import { updateSectionStatus, updateSectionComments, updateSubTableData, toggleSectionCarryForward } from '../../services/reportService';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { auth } from '../../firebase';
import { StatusBadge } from './StatusBadge';
import { SectionPresence } from './SectionPresence';
import { CommentField } from '../fields/CommentField';
import { SubTable } from '../fields/SubTable';
import { RevisionHistory } from './RevisionHistory';
import { StaffingImportModal } from './StaffingImportModal';
import { parseStaffingIssues } from '../../utils/parseStaffingIssues';
import styles from './ReportSection.module.css';

function useSection({ reportId, sectionDef, sectionData, onFocusSection, onBlurSection }) {
  const serverComments = sectionData?.comments || '';
  const [localComments, setLocalComments] = useState(serverComments);
  const [isFocused, setIsFocused] = useState(false);
  // Set when a *different* user saves this section while we have unsaved edits.
  const [conflict, setConflict] = useState(null);   // { theirValue, editedBy } | null

  // pendingRef: the value the user has typed that a matching snapshot hasn't
  // confirmed yet. null once our local copy is back in sync with the server.
  const pendingRef  = useRef(null);
  // baselineRef: the last server value we were in sync with — lets us tell our
  // own save-echoes (which briefly differ) apart from a real external change.
  const baselineRef = useRef(serverComments);
  const reportRef   = useRef(reportId);
  const myName = auth.currentUser?.displayName || auth.currentUser?.email || '';

  // Navigating to another date/plant reuses this component instance, so wipe
  // any stale pending/conflict state and re-baseline to the new report.
  useEffect(() => {
    if (reportRef.current !== reportId) {
      reportRef.current   = reportId;
      pendingRef.current  = null;
      baselineRef.current = serverComments;
      setConflict(null);
      setLocalComments(serverComments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // Reconcile incoming server comments with what the user is editing locally.
  useEffect(() => {
    if (isFocused) return;                 // never move the cursor while editing
    const incoming = serverComments;

    if (pendingRef.current !== null) {
      // We have an unconfirmed local edit in flight.
      if (incoming === pendingRef.current) {
        // Our own save round-tripped — back in sync, drop any conflict.
        pendingRef.current  = null;
        baselineRef.current = incoming;
        setConflict(null);
      } else if (
        incoming !== baselineRef.current &&
        sectionData?.lastEditedBy &&
        sectionData.lastEditedBy !== myName
      ) {
        // Someone ELSE saved a different value while our edits were pending.
        // Do NOT overwrite the user's text — surface a conflict to resolve.
        setConflict({ theirValue: incoming, editedBy: sectionData.lastEditedBy });
      }
      // Otherwise it's our own earlier save echoing back (or an unchanged
      // baseline) — ignore it so the editor doesn't flicker back to old text.
      return;
    }

    // No pending edits → adopt the server value live (real-time collaboration).
    if (incoming !== localComments) setLocalComments(incoming);
    baselineRef.current = incoming;
  }, [serverComments, isFocused, sectionData?.lastEditedBy, myName]);  // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSaveComments = useDebouncedCallback((value) => {
    updateSectionComments(reportId, sectionDef.id, value);
  }, 500);

  const handleCommentsChange = (value) => {
    setLocalComments(value);
    pendingRef.current = value;
    debouncedSaveComments(value);
  };

  const handleStatusChange = (status) => updateSectionStatus(reportId, sectionDef.id, status);
  const handleSubTableChange = (data) => updateSubTableData(reportId, sectionDef.id, data);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusSection?.(sectionDef.id);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlurSection?.(sectionDef.id);
    debouncedSaveComments.flush();
  };

  // Conflict resolution — the user explicitly chooses; we never auto-clobber.
  const resolveKeepMine = () => {
    const mine = pendingRef.current ?? localComments;
    pendingRef.current = mine;            // keep pending until our re-save confirms
    setConflict(null);
    updateSectionComments(reportId, sectionDef.id, mine);
  };
  const resolveUseTheirs = () => {
    const theirs = conflict?.theirValue ?? serverComments;
    pendingRef.current  = null;
    baselineRef.current = theirs;
    setLocalComments(theirs);
    setConflict(null);
  };

  return {
    localComments,
    conflict,
    resolveKeepMine,
    resolveUseTheirs,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  };
}

function ConflictBanner({ conflict, onKeepMine, onUseTheirs }) {
  if (!conflict) return null;
  return (
    <div className={styles.conflictBanner}>
      <span className={styles.conflictText}>
        <strong>{conflict.editedBy}</strong> saved a change to this section while
        you were editing. Keep your version or load theirs?
      </span>
      <div className={styles.conflictActions}>
        <button type="button" className={styles.conflictKeep} onClick={onKeepMine}>
          Keep mine
        </button>
        <button type="button" className={styles.conflictTheirs} onClick={onUseTheirs}>
          Use theirs
        </button>
      </div>
    </div>
  );
}

function SectionContent({ sectionDef, sectionData, isAdmin, readOnly, plantId, localComments, onCommentsChange, onSubTableChange, onFocus, onBlur, conflict, onKeepMine, onUseTheirs }) {
  return (
    <>
      {sectionDef.sectionType === SECTION_TYPES.NORMAL ? (
        <>
          <ConflictBanner conflict={conflict} onKeepMine={onKeepMine} onUseTheirs={onUseTheirs} />
          <CommentField
            value={localComments}
            onChange={onCommentsChange}
            readOnly={readOnly}
            onFocus={onFocus}
            onBlur={onBlur}
            richText={sectionDef.id === 'tooling' || sectionDef.id === 'operations-update'}
          />
        </>
      ) : (
        <SubTable
          type={sectionDef.sectionType}
          data={sectionData?.subTableData || []}
          onChange={onSubTableChange}
          readOnly={readOnly}
          isAdmin={isAdmin}
          plantId={plantId}
        />
      )}
    </>
  );
}

function LastEditButton({ sectionData, isAdmin, onClick }) {
  const hasEditor = !!sectionData?.lastEditedBy;
  // Admins always see a History link; regular users only see it once there's an edit record
  if (!hasEditor && !isAdmin) return null;

  const time = sectionData?.lastEditedAt?.toDate?.()?.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <button className={styles.lastEditBtn} onClick={onClick} title="View revision history">
      {hasEditor ? (
        <>
          Last edit by {sectionData.lastEditedBy}
          {time && <> at {time}</>}
          {' · '}
        </>
      ) : null}
      <span className={styles.historyLink}>History</span>
    </button>
  );
}

// ── Desktop: renders a <tr> inside the table ──────────────────────────────
export function ReportSection({ reportId, sectionDef, sectionData, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const {
    localComments,
    conflict,
    resolveKeepMine,
    resolveUseTheirs,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  } = useSection({ reportId, sectionDef, sectionData, onFocusSection, onBlurSection });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [importMsg,   setImportMsg]   = useState('');
  const isAdmin = useIsAdmin(auth.currentUser);
  // Default ON — data carries forward unless explicitly disabled
  const isCarryForward = sectionData?.carryForward ?? true;
  // reportId format: "GAP_2026-04-07"
  const plantId    = reportId?.split('_')[0] || '';
  const reportDate = reportId?.split('_')[1] || '';

  const isSubTable        = sectionDef.sectionType !== SECTION_TYPES.NORMAL;
  const isStaffingSection = sectionDef.id === 'staffing-issues';
  const status            = sectionData?.status || '';
  const rowBorderColor    = STATUS_COLORS[isSubTable ? '' : status];

  const handleImported = (count) => {
    setImportMsg(`✓ ${count} absence${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => setImportMsg(''), 5000);
  };

  return (
    <>
      <tr
        className={styles.row}
        style={{ borderLeft: `4px solid ${rowBorderColor}` }}
      >
        <td className={styles.responsible}>
          {isAdmin && !readOnly && (
            <input
              type="checkbox"
              className={styles.permanentToggle}
              checked={isCarryForward}
              onChange={(e) => toggleSectionCarryForward(reportId, sectionDef.id, e.target.checked)}
              title={isCarryForward ? 'Carrying forward to next day — click to disable' : 'Not carrying forward — click to enable'}
            />
          )}
          {sectionDef.responsible}
        </td>
        <td className={styles.measurable}>
          {sectionDef.measurable}
          {sectionDef.thresholds && (
            <div className={styles.thresholdHint}>
              {sectionDef.thresholds.map((t) => <div key={t}>{t}</div>)}
            </div>
          )}
        </td>
        {!isSubTable && (
          <td className={styles.status}>
            <StatusBadge value={status} onChange={handleStatusChange} readOnly={readOnly} />
          </td>
        )}
        <td className={styles.content} colSpan={isSubTable ? 2 : 1}>
          <SectionPresence presenceMap={presenceMap} sectionId={sectionDef.id} />
          <SectionContent
            sectionDef={sectionDef}
            sectionData={sectionData}
            isAdmin={isAdmin}
            readOnly={readOnly}
            plantId={plantId}
            localComments={localComments}
            onCommentsChange={handleCommentsChange}
            onSubTableChange={handleSubTableChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            conflict={conflict}
            onKeepMine={resolveKeepMine}
            onUseTheirs={resolveUseTheirs}
          />
          {isStaffingSection && isAdmin && !readOnly && (
            <div className={styles.importRow}>
              {importMsg && <span className={styles.importSuccess}>{importMsg}</span>}
              <button
                className={styles.importAbsenteeBtn}
                onClick={() => setImportOpen(true)}
                disabled={!localComments?.trim()}
                title="Parse staffing issues text and add to Absentee Report"
              >
                ↓ Import to Absentee
              </button>
            </div>
          )}
          <LastEditButton sectionData={sectionData} isAdmin={isAdmin} onClick={() => setHistoryOpen(true)} />
        </td>
      </tr>

      {historyOpen && (
        <RevisionHistory
          reportId={reportId}
          sectionId={sectionDef.id}
          sectionDef={sectionDef}
          readOnly={readOnly}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {importOpen && (
        <StaffingImportModal
          entries={parseStaffingIssues(localComments, { plantId, date: reportDate })}
          plantId={plantId}
          date={reportDate}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </>
  );
}

// ── Mobile: renders a card div ────────────────────────────────────────────
export function ReportSectionCard({ reportId, sectionDef, sectionData, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const {
    localComments,
    conflict,
    resolveKeepMine,
    resolveUseTheirs,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  } = useSection({ reportId, sectionDef, sectionData, onFocusSection, onBlurSection });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [importMsg,   setImportMsg]   = useState('');
  const isAdmin = useIsAdmin(auth.currentUser);
  // Default ON — data carries forward unless explicitly disabled
  const isCarryForward = sectionData?.carryForward ?? true;
  const plantId    = reportId?.split('_')[0] || '';
  const reportDate = reportId?.split('_')[1] || '';

  const isSubTable        = sectionDef.sectionType !== SECTION_TYPES.NORMAL;
  const isStaffingSection = sectionDef.id === 'staffing-issues';
  const status            = sectionData?.status || '';
  const borderColor       = STATUS_COLORS[isSubTable ? '' : status];

  const handleImported = (count) => {
    setImportMsg(`✓ ${count} absence${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => setImportMsg(''), 5000);
  };

  return (
    <>
      <div className={styles.card} style={{ borderLeftColor: borderColor }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardMeta}>
            <div className={styles.cardMeasurable}>
              {sectionDef.measurable}
              {sectionDef.thresholds && (
                <div className={styles.thresholdHint}>
                  {sectionDef.thresholds.map((t) => <div key={t}>{t}</div>)}
                </div>
              )}
            </div>
            <div className={styles.cardResponsible}>{sectionDef.responsible}</div>
          </div>
          <div className={styles.cardHeaderActions}>
            {isAdmin && !readOnly && (
              <input
                type="checkbox"
                className={styles.permanentToggle}
                checked={isCarryForward}
                onChange={(e) => toggleSectionCarryForward(reportId, sectionDef.id, e.target.checked)}
                title={isCarryForward ? 'Carrying forward to next day — click to disable' : 'Not carrying forward — click to enable'}
              />
            )}
            {!isSubTable && (
              <StatusBadge value={status} onChange={handleStatusChange} readOnly={readOnly} />
            )}
          </div>
        </div>
        <div className={styles.cardBody}>
          <SectionPresence presenceMap={presenceMap} sectionId={sectionDef.id} />
          <SectionContent
            sectionDef={sectionDef}
            sectionData={sectionData}
            isAdmin={isAdmin}
            readOnly={readOnly}
            plantId={plantId}
            localComments={localComments}
            onCommentsChange={handleCommentsChange}
            onSubTableChange={handleSubTableChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            conflict={conflict}
            onKeepMine={resolveKeepMine}
            onUseTheirs={resolveUseTheirs}
          />
          {isStaffingSection && isAdmin && !readOnly && (
            <div className={styles.importRow}>
              {importMsg && <span className={styles.importSuccess}>{importMsg}</span>}
              <button
                className={styles.importAbsenteeBtn}
                onClick={() => setImportOpen(true)}
                disabled={!localComments?.trim()}
                title="Parse staffing issues text and add to Absentee Report"
              >
                ↓ Import to Absentee
              </button>
            </div>
          )}
          <LastEditButton sectionData={sectionData} isAdmin={isAdmin} onClick={() => setHistoryOpen(true)} />
        </div>
      </div>

      {historyOpen && (
        <RevisionHistory
          reportId={reportId}
          sectionId={sectionDef.id}
          sectionDef={sectionDef}
          readOnly={readOnly}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {importOpen && (
        <StaffingImportModal
          entries={parseStaffingIssues(localComments, { plantId, date: reportDate })}
          plantId={plantId}
          date={reportDate}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </>
  );
}
