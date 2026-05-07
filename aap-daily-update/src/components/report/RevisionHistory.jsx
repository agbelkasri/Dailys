import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { updateSectionStatus, updateSubTableData, updateSectionComments } from '../../services/reportService';
import { STATUS_COLORS, STATUS_TEXT_COLORS, STATUS_LABELS } from '../../constants/colors';
import { auth } from '../../firebase';
import styles from './RevisionHistory.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts) {
  if (!ts?.toDate) return '—';
  const date = ts.toDate();
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today at ${timeStr}`;
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}

function ChangeDescription({ field, value }) {
  if (field === 'status') {
    const bg = STATUS_COLORS[value] ?? STATUS_COLORS[''];
    const color = STATUS_TEXT_COLORS[value] ?? STATUS_TEXT_COLORS[''];
    const label = STATUS_LABELS[value] ?? 'Cleared';
    return (
      <span className={styles.changeRow}>
        Status set to{' '}
        {value ? (
          <span className={styles.statusChip} style={{ background: bg, color }}>
            {value} — {label}
          </span>
        ) : (
          <span className={styles.cleared}>cleared</span>
        )}
      </span>
    );
  }

  if (field === 'subTableData') {
    const count = Array.isArray(value) ? value.length : 0;
    return (
      <span className={styles.changeRow}>
        Table updated —{' '}
        <strong>{count}</strong> row{count !== 1 ? 's' : ''}
      </span>
    );
  }

  if (field === 'comments') {
    const trimmed = (value || '').trim();
    const snippet = trimmed.length > 72 ? trimmed.slice(0, 72) + '…' : trimmed;
    return (
      <span className={styles.changeRow}>
        {trimmed ? (
          <>
            <span className={styles.commentLabel}>Comment:</span>{' '}
            <span className={styles.commentSnippet}>&ldquo;{snippet}&rdquo;</span>
          </>
        ) : (
          <span className={styles.cleared}>comment cleared</span>
        )}
      </span>
    );
  }

  if (field === 'carryForward' || field === 'permanent') {
    return (
      <span className={styles.changeRow}>
        Carry-forward{' '}
        <strong>{value ? 'enabled' : 'disabled'}</strong>
      </span>
    );
  }

  return <span className={styles.changeRow}>{field} updated</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function RevisionHistory({ reportId, sectionId, sectionDef, readOnly, onClose }) {
  const { entries, loading } = useAuditLog(reportId, sectionId);
  const isAdmin = useIsAdmin(auth.currentUser);
  const canRestore = isAdmin && !readOnly;
  const [restoring, setRestoring] = useState(null);
  const [justRestored, setJustRestored] = useState(null);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleRestore(entry) {
    if (restoring != null) return;
    setRestoring(entry.id);
    try {
      if (entry.field === 'status') {
        await updateSectionStatus(reportId, sectionId, entry.newValue);
      } else if (entry.field === 'subTableData') {
        await updateSubTableData(reportId, sectionId, entry.newValue);
      } else if (entry.field === 'comments') {
        await updateSectionComments(reportId, sectionId, entry.newValue);
      }
      setJustRestored(entry.id);
      setTimeout(() => setJustRestored(null), 2500);
    } finally {
      setRestoring(null);
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.panel} role="dialog" aria-modal="true">

        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.headerText}>
            <h3 className={styles.panelTitle}>Revision History</h3>
            <p className={styles.panelSubtitle}>{sectionDef.measurable}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          {loading && (
            <div className={styles.emptyState}>Loading history…</div>
          )}

          {!loading && entries.length === 0 && (
            <div className={styles.emptyState}>
              No recorded changes yet.
              <span className={styles.emptyHint}>
                Status and table edits are logged here automatically.
              </span>
            </div>
          )}

          {entries.map((entry) => {
            const isRestoring = restoring === entry.id;
            const isRestored = justRestored === entry.id;
            return (
              <div key={entry.id} className={styles.entry}>
                <div className={styles.entryLeft}>
                  <div className={styles.entryUser}>
                    {entry.editedBy?.displayName || entry.editedBy?.email || 'Unknown user'}
                  </div>
                  <div className={styles.entryTime}>
                    {formatTimestamp(entry.editedAt)}
                  </div>
                  <ChangeDescription field={entry.field} value={entry.newValue} />
                </div>

                {canRestore && entry.field !== 'carryForward' && entry.field !== 'permanent' && (
                  <button
                    className={`${styles.restoreBtn} ${isRestored ? styles.restoredBtn : ''}`}
                    onClick={() => handleRestore(entry)}
                    disabled={restoring != null}
                    title="Restore this version"
                  >
                    {isRestoring ? '…' : isRestored ? '✓ Done' : 'Restore'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        {!loading && entries.length > 0 && (
          <div className={styles.panelFooter}>
            Showing last {entries.length} change{entries.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
