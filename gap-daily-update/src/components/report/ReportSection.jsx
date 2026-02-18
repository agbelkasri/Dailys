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

export function ReportSection({ date, sectionDef, sectionData, readOnly, presenceMap, onFocusSection, onBlurSection }) {
  const [localComments, setLocalComments] = useState(sectionData?.comments || '');

  // Sync incoming real-time changes from other users into local state
  // Only update if the field is not currently focused (to avoid clobbering your own typing)
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

  const handleStatusChange = (status) => {
    updateSectionStatus(date, sectionDef.id, status);
  };

  const handleSubTableChange = (data) => {
    updateSubTableData(date, sectionDef.id, data);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusSection?.(sectionDef.id);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlurSection?.(sectionDef.id);
    // Flush any pending debounced save on blur
    debouncedSaveComments.flush();
  };

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
        <StatusBadge
          value={status}
          onChange={handleStatusChange}
          readOnly={readOnly}
        />
      </td>
      <td className={styles.content}>
        <SectionPresence presenceMap={presenceMap} sectionId={sectionDef.id} />

        {sectionDef.sectionType === SECTION_TYPES.NORMAL ? (
          <CommentField
            value={localComments}
            onChange={handleCommentsChange}
            readOnly={readOnly}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        ) : (
          <SubTable
            type={sectionDef.sectionType}
            data={sectionData?.subTableData || []}
            onChange={handleSubTableChange}
            readOnly={readOnly}
          />
        )}

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
