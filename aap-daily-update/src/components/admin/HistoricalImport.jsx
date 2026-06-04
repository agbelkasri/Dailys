import { useState, useRef } from 'react';
import {
  doc, getDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { parseWorkbook } from '../../utils/parseHistoricalExcel';
import styles from './HistoricalImport.module.css';

/**
 * Admin-only page for bulk-importing historical Daily Reports from .xlsx
 * files in the same shape weeklyBackup.js produces (one workbook per
 * plant per week with Monday–Friday sheets).
 *
 * Flow:
 *   1. Drag .xlsx files (or click to pick) → parser runs on each
 *   2. Per-day rows render with plant, date, section count, "exists?" badge
 *   3. Click "Import all" → batched Firestore writes, one batch per day
 *   4. Each row updates live as it imports (idle → writing → done / error)
 *
 * Uses the regular Firestore client SDK with the signed-in admin's
 * credentials — same auth that lets them edit reports manually.
 *
 * Parsing runs entirely in the browser (exceljs is bundled), so no
 * Cloud Function needed and no server-side state to manage.
 */
export function HistoricalImport() {
  const [days, setDays]               = useState([]);   // [{ id, plant, date, sheetName, sections, status, error, exists }]
  const [overwrite, setOverwrite]     = useState(false);
  const [importing, setImporting]     = useState(false);
  const [parsing, setParsing]         = useState(false);
  const [parseErrors, setParseErrors] = useState([]);   // [{ file, message }]
  const [dragging, setDragging]       = useState(false);
  const fileInputRef = useRef(null);

  async function handleFiles(fileList) {
    setParsing(true);
    setParseErrors([]);

    // ExcelJS is a chunky dependency — lazy-load only when an admin
    // actually opens this page and adds a file.
    const ExcelJS = (await import('exceljs')).default;

    const newDays = [];
    const errors  = [];

    for (const file of fileList) {
      const wb = new ExcelJS.Workbook();
      try {
        const buf = await file.arrayBuffer();
        await wb.xlsx.load(buf);
      } catch (err) {
        errors.push({ file: file.name, message: `Couldn't read: ${err.message}` });
        continue;
      }

      const parsed = parseWorkbook(wb, file.name);
      if (parsed.length === 0) {
        errors.push({ file: file.name, message: 'Filename pattern not recognized or no day-sheets found' });
        continue;
      }

      for (const day of parsed) {
        const id = `${day.plant}_${day.date}`;
        // Check existence via Firestore so the "EXISTS" badge is accurate
        let exists = false;
        try {
          const snap = await getDoc(doc(db, 'reports', id));
          exists = snap.exists();
        } catch {
          // Ignore — reads can fail mid-load; user re-tries
        }
        newDays.push({
          id,
          plant:        day.plant,
          date:         day.date,
          sheetName:    day.sheetName,
          sectionCount: Object.keys(day.sections).length,
          sections:     day.sections,
          status:       'idle',
          error:        null,
          exists,
          file:         file.name,
        });
      }
    }

    // Merge with previous list, de-duplicate by id (keep new — re-adding a
    // file should refresh its parse, not double-list)
    setDays(prev => {
      const byId = new Map(prev.map(d => [d.id, d]));
      for (const d of newDays) byId.set(d.id, d);
      return [...byId.values()].sort((a, b) =>
        a.date === b.date ? a.plant.localeCompare(b.plant) : a.date.localeCompare(b.date)
      );
    });
    setParseErrors(errors);
    setParsing(false);
  }

  function removeDay(id) {
    setDays(prev => prev.filter(d => d.id !== id));
  }

  function clearAll() {
    setDays([]);
    setParseErrors([]);
  }

  async function importAll() {
    setImporting(true);

    // Only attempt rows that aren't already done and aren't skipped-due-to-existing
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.status === 'done') continue;
      if (day.exists && !overwrite) {
        setDays(prev => prev.map(d => d.id === day.id ? { ...d, status: 'skipped' } : d));
        continue;
      }

      setDays(prev => prev.map(d => d.id === day.id ? { ...d, status: 'writing', error: null } : d));

      try {
        const reportRef = doc(db, 'reports', day.id);
        const batch = writeBatch(db);

        batch.set(reportRef, {
          reportDate:        day.date,
          plantId:           day.plant,
          importedFromExcel: true,
          importedAt:        serverTimestamp(),
        }, { merge: true });

        for (const [sectionId, sectionData] of Object.entries(day.sections)) {
          const sref = doc(db, 'reports', day.id, 'sections', sectionId);
          batch.set(sref, {
            ...sectionData,
            importedFromExcel: true,
            importedAt:        serverTimestamp(),
          }, { merge: true });
        }
        await batch.commit();

        setDays(prev => prev.map(d => d.id === day.id ? { ...d, status: 'done', exists: true } : d));
      } catch (err) {
        console.error('Import failed for', day.id, err);
        setDays(prev => prev.map(d => d.id === day.id ? { ...d, status: 'error', error: err.message } : d));
      }
    }

    setImporting(false);
  }

  const pendingCount = days.filter(d => d.status === 'idle' && (overwrite || !d.exists)).length;
  const doneCount    = days.filter(d => d.status === 'done').length;
  const errorCount   = days.filter(d => d.status === 'error').length;
  const skippedCount = days.filter(d => d.status === 'skipped').length;

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>Historical Excel Import</h1>
      <p className={styles.intro}>
        Bulk-load older Daily Reports from Excel files into Firestore. Files must use the
        same template as <code>GAP Daily Report Wk M.D.YY.xlsx</code> — one workbook per
        plant per week with Monday–Friday on separate sheets.
      </p>

      {/* Drop zone */}
      <div
        className={dragging ? styles.dropZoneActive : styles.dropZone}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className={styles.dropIcon}>📥</div>
        <div className={styles.dropPrimary}>
          {parsing ? 'Parsing…' : 'Drag .xlsx files here, or click to browse'}
        </div>
        <div className={styles.dropSecondary}>
          Each workbook can contain multiple day-sheets. They'll be listed below for review.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className={styles.errorBanner}>
          <strong>Files that couldn't be parsed:</strong>
          <ul>
            {parseErrors.map((e, i) => (
              <li key={i}><code>{e.file}</code> — {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Day-by-day list */}
      {days.length > 0 && (
        <>
          <div className={styles.toolbar}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                disabled={importing}
              />
              Overwrite existing reports
            </label>
            <div className={styles.spacer} />
            <button
              className={styles.secondaryBtn}
              onClick={clearAll}
              disabled={importing}
            >
              Clear list
            </button>
            <button
              className={styles.primaryBtn}
              onClick={importAll}
              disabled={importing || pendingCount === 0}
            >
              {importing
                ? `Importing… (${doneCount} of ${days.length})`
                : `Import ${pendingCount} day${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plant</th>
                <th>Date</th>
                <th>Sheet</th>
                <th>Sections</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.id}>
                  <td><span className={styles[`plant${d.plant}`]}>{d.plant}</span></td>
                  <td>{d.date}</td>
                  <td className={styles.sheetCol}>{d.sheetName}</td>
                  <td>{d.sectionCount}</td>
                  <td>
                    <StatusCell day={d} overwrite={overwrite} />
                  </td>
                  <td>
                    {!importing && d.status !== 'done' && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeDay(d.id)}
                        title="Remove from list"
                      >×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(doneCount + errorCount + skippedCount) > 0 && (
            <div className={styles.summary}>
              <strong>Summary:</strong>{' '}
              {doneCount > 0    && <span className={styles.summaryDone}>{doneCount} imported</span>}
              {skippedCount > 0 && <span className={styles.summarySkip}>{' · '}{skippedCount} skipped (already exist)</span>}
              {errorCount > 0   && <span className={styles.summaryErr}>{' · '}{errorCount} failed</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusCell({ day, overwrite }) {
  if (day.status === 'writing') return <span className={styles.statWriting}>Writing…</span>;
  if (day.status === 'done')    return <span className={styles.statDone}>✓ Imported</span>;
  if (day.status === 'skipped') return <span className={styles.statSkip}>Skipped (exists)</span>;
  if (day.status === 'error')   return (
    <span className={styles.statErr} title={day.error}>
      ✗ Failed — {day.error?.slice(0, 60)}
    </span>
  );
  // idle
  if (day.exists && !overwrite) return <span className={styles.statBadge}>Exists — will skip</span>;
  if (day.exists && overwrite)  return <span className={styles.statBadgeWarn}>Exists — will overwrite</span>;
  return <span className={styles.statBadgeOk}>Ready</span>;
}
