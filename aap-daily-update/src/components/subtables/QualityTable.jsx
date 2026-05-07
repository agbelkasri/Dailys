import { useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RowStatusCell } from './RowStatusCell';
import { AutoTextarea } from './AutoTextarea';
import { usePressParts } from '../../hooks/usePressParts';
import { savePressParts } from '../../services/pressPartsService';
import styles from './SubTable.module.css';
import mgmtStyles from './PressPartsManager.module.css';

// ─── Press Parts Manager (admin only) ────────────────────────────────────────
function PressPartsManager({ plantId, partsMap, onClose }) {
  const [map, setMap] = useState(() => {
    // Deep clone so edits don't mutate live data
    const m = {};
    Object.entries(partsMap).forEach(([wc, parts]) => { m[wc] = [...parts]; });
    return m;
  });
  const [newWC, setNewWC] = useState('');
  const [saving, setSaving] = useState(false);

  const workcenters = Object.keys(map).sort();

  function addWorkcenter() {
    const wc = newWC.trim().toUpperCase();
    if (!wc || map[wc]) return;
    setMap(prev => ({ ...prev, [wc]: [] }));
    setNewWC('');
  }

  function removeWorkcenter(wc) {
    setMap(prev => { const n = { ...prev }; delete n[wc]; return n; });
  }

  function addPart(wc) {
    setMap(prev => ({
      ...prev,
      [wc]: [...(prev[wc] || []), ''],
    }));
  }

  function updatePart(wc, idx, value) {
    setMap(prev => {
      const parts = [...prev[wc]];
      parts[idx] = value;
      return { ...prev, [wc]: parts };
    });
  }

  function removePart(wc, idx) {
    setMap(prev => {
      const parts = prev[wc].filter((_, i) => i !== idx);
      return { ...prev, [wc]: parts };
    });
  }

  async function handleSave() {
    setSaving(true);
    // Strip empty entries before saving
    const clean = {};
    Object.entries(map).forEach(([wc, parts]) => {
      const filtered = parts.map(p => p.trim()).filter(Boolean);
      if (wc.trim()) clean[wc.trim().toUpperCase()] = filtered;
    });
    try {
      await savePressParts(plantId, clean);
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={mgmtStyles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={mgmtStyles.panel}>
        <div className={mgmtStyles.header}>
          <h3 className={mgmtStyles.title}>Manage Press Parts — {plantId}</h3>
          <button className={mgmtStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={mgmtStyles.body}>
          <p className={mgmtStyles.hint}>
            Add up to 10 parts per workcenter. These appear as suggestions in the Part # dropdown.
          </p>

          {/* Add new workcenter */}
          <div className={mgmtStyles.addWCRow}>
            <input
              className={mgmtStyles.wcInput}
              value={newWC}
              onChange={e => setNewWC(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWorkcenter()}
              placeholder="Workcenter Code (e.g. WC001)"
            />
            <button className={mgmtStyles.addWCBtn} onClick={addWorkcenter}>+ Add Press</button>
          </div>

          {workcenters.length === 0 && (
            <div className={mgmtStyles.empty}>No presses configured yet. Add one above.</div>
          )}

          {workcenters.map(wc => (
            <div key={wc} className={mgmtStyles.wcBlock}>
              <div className={mgmtStyles.wcHeader}>
                <span className={mgmtStyles.wcLabel}>{wc}</span>
                <span className={mgmtStyles.partCount}>{map[wc].length} / 10</span>
                <button className={mgmtStyles.removeWCBtn} onClick={() => removeWorkcenter(wc)} title="Remove press">✕</button>
              </div>
              <div className={mgmtStyles.partsList}>
                {map[wc].map((part, idx) => (
                  <div key={idx} className={mgmtStyles.partRow}>
                    <input
                      className={mgmtStyles.partInput}
                      value={part}
                      onChange={e => updatePart(wc, idx, e.target.value)}
                      placeholder={`Part #${idx + 1}`}
                    />
                    <button
                      className={mgmtStyles.removePartBtn}
                      onClick={() => removePart(wc, idx)}
                      title="Remove part"
                    >×</button>
                  </div>
                ))}
                {map[wc].length < 10 && (
                  <button className={mgmtStyles.addPartBtn} onClick={() => addPart(wc)}>
                    + Add Part
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={mgmtStyles.footer}>
          <button className={mgmtStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={mgmtStyles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Part No cell — traditional select when parts are configured ──────────────
function PartNoCell({ value, onChange, suggestedParts }) {
  // customMode: user opted to type a value not in the list
  const [customMode, setCustomMode] = useState(
    () => value !== '' && !suggestedParts.includes(value)
  );

  // If the value changes externally (e.g. carried forward) and IS in the list,
  // snap back out of custom mode so the select shows it correctly.
  useEffect(() => {
    if (value !== '' && suggestedParts.includes(value)) {
      setCustomMode(false);
    }
  }, [value, suggestedParts]);

  // No configured parts — plain text input, full column width
  if (suggestedParts.length === 0) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Part #"
        className={styles.partNoSelect}
      />
    );
  }

  // Custom entry mode — text input + "Back to list" button
  if (customMode) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Part #"
          style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 3, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          className={styles.partNoBackBtn}
          onClick={() => { onChange(''); setCustomMode(false); }}
          title="Back to dropdown list"
        >← List</button>
      </div>
    );
  }

  // Standard select dropdown
  return (
    <select
      className={styles.partNoSelect}
      value={value}
      onChange={(e) => {
        if (e.target.value === '__other__') {
          setCustomMode(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">— Select —</option>
      {suggestedParts.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
      <option value="__other__">Other…</option>
    </select>
  );
}

// ─── QualityTable ─────────────────────────────────────────────────────────────
export function QualityTable({ data, onChange, readOnly, isAdmin, plantId }) {
  const rows = data?.length ? data : [];
  const canDrag = isAdmin && !readOnly;
  const [showManager, setShowManager] = useState(false);

  const { partsMap } = usePressParts(plantId);

  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const addRow = () => {
    onChange([...rows, { id: uuidv4(), status: '', workcenterCode: '', partNumber: '', statusNotes: '' }]);
  };

  const addRowAfter = (afterId, workcenterCode) => {
    const idx = rows.findIndex((r) => r.id === afterId);
    const newRow = { id: uuidv4(), status: '', workcenterCode, partNumber: '', statusNotes: '' };
    const next = [...rows];
    next.splice(idx + 1, 0, newRow);
    onChange(next);
  };

  const updateRow = (id, field, value) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const handleDragStart = (e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverId !== id) setDragOverId(id); };
  const handleDrop      = (e, targetId) => {
    e.preventDefault(); setDragOverId(null);
    if (!dragId.current || dragId.current === targetId) return;
    const srcIdx = rows.findIndex((r) => r.id === dragId.current);
    const tgtIdx = rows.findIndex((r) => r.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const next = [...rows];
    const [item] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, item);
    onChange(next);
  };
  const handleDragEnd = () => { dragId.current = null; setDragOverId(null); };

  const colSpan = (readOnly ? 4 : 5) + (canDrag ? 1 : 0);

  return (
    <>
      <div className={styles.wrapper}>
        {/* Admin toolbar */}
        {isAdmin && !readOnly && plantId && (
          <div className={styles.tableToolbar}>
            <button className={styles.managePartsBtn} onClick={() => setShowManager(true)} title="Manage part suggestions per press">
              ⚙ Manage Press Parts
            </button>
          </div>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              {canDrag && <th className={styles.dragCol}></th>}
              <th className={styles.statusCol}>Status</th>
              <th className={styles.narrowCol}>Workcenter Code</th>
              <th className={styles.partNoCol}>Part No</th>
              <th>Status Notes</th>
              {!readOnly && <th className={styles.actionCol}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className={styles.emptyRow}>
                  {readOnly ? 'No entries' : 'No rows yet — click Add Row'}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              // Get the parts list for this row's workcenter code
              const wcKey = (row.workcenterCode || '').trim().toUpperCase();
              const suggestedParts = (wcKey && partsMap[wcKey]) ? partsMap[wcKey] : [];

              return (
                <tr
                  key={row.id}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, row.id) : undefined}
                  onDragOver={canDrag  ? (e) => handleDragOver(e, row.id)  : undefined}
                  onDrop={canDrag      ? (e) => handleDrop(e, row.id)      : undefined}
                  onDragEnd={canDrag   ? handleDragEnd                      : undefined}
                  className={dragOverId === row.id ? styles.dragOverRow : undefined}
                >
                  {canDrag && (
                    <td className={styles.dragHandle} title="Drag to reorder">⠿</td>
                  )}
                  <td className={styles.statusCol}>
                    <RowStatusCell
                      value={row.status}
                      onChange={(v) => updateRow(row.id, 'status', v)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td>
                    {readOnly ? row.workcenterCode : (
                      <input
                        value={row.workcenterCode}
                        onChange={(e) => updateRow(row.id, 'workcenterCode', e.target.value)}
                        placeholder="WC Code"
                        className={styles.narrowInput}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (row.partNumber || '') : (
                      <PartNoCell
                        value={row.partNumber}
                        onChange={(v) => updateRow(row.id, 'partNumber', v)}
                        suggestedParts={suggestedParts}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? row.statusNotes : (
                      <AutoTextarea
                        value={row.statusNotes}
                        onChange={(e) => updateRow(row.id, 'statusNotes', e.target.value)}
                        placeholder="Status notes"
                        className={styles.tableTextarea}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.addRowBtn}
                          onClick={() => addRowAfter(row.id, row.workcenterCode)}
                          title="Add row below for same workcenter"
                        >+</button>
                        <button className={styles.removeBtn} onClick={() => removeRow(row.id)} title="Remove row">×</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!readOnly && (
          <button className={styles.addBtn} onClick={addRow}>+ Add Row</button>
        )}
      </div>

      {showManager && plantId && (
        <PressPartsManager
          plantId={plantId}
          partsMap={partsMap}
          onClose={() => setShowManager(false)}
        />
      )}
    </>
  );
}
