import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { SECTION_TYPES } from '../../constants/sections';
import { STATUS_COLORS } from '../../constants/colors';
import { updateSectionStatus, updateSectionComments, updateSubTableData } from '../../services/reportService';
import { StatusBadge } from './StatusBadge';
import { SectionPresence } from './SectionPresence';
import { CommentField } from '../fields/CommentField';
import { SubTable } from '../fields/SubTable';
import styles from './ReportSection.module.css';

function useSection({ date, sectionDef, sectionData, onFocusSection, onBlurSection }) {
  const [localComments, setLocalComments] = useState(sectionData?.comments || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalComments(sectionData?.comments || '');
    }
  }, [sectionData?.comments, isFocused]);

  const debouncedSaveComments = useDebouncedCallback((value) => {
    updateSectionComments(date, sectionDef.id, value);
  }, 500);

  const handleCommentsChange = (value) => {
    setLocalComments(value);
    debouncedSaveComments(value);
  };

  const handleStatusChange = (status) => updateSectionStatus(date, sectionDef.id, status);
  const handleSubTableChange = (data) => updateSubTableData(date, sectionDef.id, data);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusSection?.(sectionDef.id);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlurSection?.(sectionDef.id);
    debouncedSaveComments.flush();
  };

  return {
    localComments,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  };
}

function SectionContent({ sectionDef, sectionData, readOnly, localComments, onCommentsChange, onSubTableChange, onFocus, onBlur }) {
  return (
    <>
      {sectionDef.sectionType === SECTION_TYPES.NORMAL ? (
        <CommentField
          value={localComments}
          onChange={onCommentsChange}
          readOnly={readOnly}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      ) : (
        <SubTable
          type={sectionDef.sectionType}
          data={sectionData?.subTableData || []}
          onChange={onSubTableChange}
          readOnly={readOnly}
        />
      )}
    </>
  );
}

// ── Desktop: renders a <tr> inside the table ──────────────────────────────
export function ReportSection({ date, sectionDef, sectionData, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const {
    localComments,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  } = useSection({ date, sectionDef, sectionData, onFocusSection, onBlurSection });

  const status = sectionData?.status || '';
  const rowBorderColor = STATUS_COLORS[status];

  return (
    <tr
      className={styles.row}
      style={{ borderLeft: `4px solid ${rowBorderColor}` }}
    >
      <td className={styles.responsible}>{sectionDef.responsible}</td>
      <td className={styles.measurable}>{sectionDef.measurable}</td>
      <td className={styles.status}>
        <StatusBadge value={status} onChange={handleStatusChange} readOnly={readOnly} />
      </td>
      <td className={styles.content}>
        <SectionPresence presenceMap={presenceMap} sectionId={sectionDef.id} />
        <SectionContent
          sectionDef={sectionDef}
          sectionData={sectionData}
          readOnly={readOnly}
          localComments={localComments}
          onCommentsChange={handleCommentsChange}
          onSubTableChange={handleSubTableChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {sectionData?.lastEditedBy && (
          <div className={styles.lastEdit}>
            Last edit by {sectionData.lastEditedBy}
            {sectionData.lastEditedAt && (
              <> at {sectionData.lastEditedAt.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Mobile: renders a card div ────────────────────────────────────────────
export function ReportSectionCard({ date, sectionDef, sectionData, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const {
    localComments,
    handleCommentsChange,
    handleStatusChange,
    handleSubTableChange,
    handleFocus,
    handleBlur,
  } = useSection({ date, sectionDef, sectionData, onFocusSection, onBlurSection });

  const status = sectionData?.status || '';
  const borderColor = STATUS_COLORS[status];

  return (
    <div className={styles.card} style={{ borderLeftColor: borderColor }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <div className={styles.cardMeasurable}>{sectionDef.measurable}</div>
          <div className={styles.cardResponsible}>{sectionDef.responsible}</div>
        </div>
        <StatusBadge value={status} onChange={handleStatusChange} readOnly={readOnly} />
      </div>
      <div className={styles.cardBody}>
        <SectionPresence presenceMap={presenceMap} sectionId={sectionDef.id} />
        <SectionContent
          sectionDef={sectionDef}
          sectionData={sectionData}
          readOnly={readOnly}
          localComments={localComments}
          onCommentsChange={handleCommentsChange}
          onSubTableChange={handleSubTableChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {sectionData?.lastEditedBy && (
          <div className={styles.cardLastEdit}>
            Last edit by {sectionData.lastEditedBy}
            {sectionData.lastEditedAt && (
              <> at {sectionData.lastEditedAt.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
