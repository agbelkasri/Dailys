import { useState, useRef } from 'react';
import { parseTurnoverTracker } from '../../utils/parseTurnoverTracker';
import { groupMonthlyRows, groupBaselineRows, importTurnover } from '../../services/turnoverMonthlyService';
import { TURNOVER_CATEGORIES } from '../../constants/turnoverMonthly';
import styles from './TurnoverExcelImport.module.css';

/**
 * Admin importer for the "Turnover_Tracker" Excel. Parses the Baseline +
 * Monthly_Input sheets entirely in the browser (exceljs, lazy-loaded), shows a
 * review, then batch-writes to `turnoverMonthly` / `turnoverBaseline` using the
 * signed-in admin's own credentials. Mirrors the Historical Import flow.
 */
export function TurnoverExcelImport({ onImported }) {
  const [fileName, setFileName]         = useState('');
  const [monthlyDocs, setMonthlyDocs]   = useState([]);
  const [baselineDocs, setBaselineDocs] = useState([]);
  const [warnings, setWarnings]         = useState([]);
  const [parsing, setParsing]           = useState(false);
  const [importing, setImporting]       = useState(false);
  const [done, setDone]                 = useState(null);
  const [err, setErr]                   = useState(null);
  const [dragging, setDragging]         = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setParsing(true); setErr(null); setDone(null);
    setMonthlyDocs([]); setBaselineDocs([]); setWarnings([]);
    setFileName(file.name);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const { baseline, monthly, warnings: w } = parseTurnoverTracker(wb);
      const mDocs = groupMonthlyRows(monthly);
      const bDocs = groupBaselineRows(baseline);
      setMonthlyDocs(mDocs);
      setBaselineDocs(bDocs);
      setWarnings(w);
      if (mDocs.length === 0) {
        setErr('No monthly rows recognized — check that this is the Turnover_Tracker workbook.');
      }
    } catch (e) {
      setErr(`Couldn't read ${file.name}: ${e.message}`);
    } finally {
      setParsing(false);
    }
  }

  async function doImport() {
    setImporting(true); setErr(null);
    try {
      const res = await importTurnover({ monthlyDocs, baselineDocs });
      setDone(res);
      onImported?.();
    } catch (e) {
      console.error('Turnover import failed:', e);
      setErr(e.message);
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFileName(''); setMonthlyDocs([]); setBaselineDocs([]);
    setWarnings([]); setErr(null); setDone(null);
  }

  const months = [...new Set(monthlyDocs.map(d => d.month))].sort();
  const plants = [...new Set(monthlyDocs.map(d => d.plantId))].sort();
  const totalTerms = monthlyDocs.reduce(
    (s, d) => s + (d.salary.terminations + d.direct.terminations + d.indirect.terminations), 0
  );

  return (
    <div className={styles.wrapper}>
      <p className={styles.intro}>
        Upload the <code>Turnover_Tracker</code> Excel (with <code>Baseline</code> and{' '}
        <code>Monthly_Input</code> sheets). Data is read in your browser and saved to the
        monthly turnover dashboard. Re-importing updates existing months.
      </p>

      <div
        className={dragging ? styles.dropActive : styles.drop}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className={styles.dropIcon}>📄</div>
        <div className={styles.dropPrimary}>
          {parsing ? 'Reading…' : fileName ? fileName : 'Drop the .xlsx here, or click to browse'}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {err && <div className={styles.error}>{err}</div>}

      {warnings.length > 0 && (
        <div className={styles.warn}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {monthlyDocs.length > 0 && !done && (
        <>
          <div className={styles.summary}>
            Found <strong>{monthlyDocs.length}</strong> plant-months across{' '}
            <strong>{months.length}</strong> months for <strong>{plants.join(', ')}</strong>,{' '}
            <strong>{totalTerms}</strong> total terminations. Baseline for{' '}
            <strong>{baselineDocs.map(b => b.plantId).join(', ') || '—'}</strong>.
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.left}>Month</th>
                  <th className={styles.left}>Plant</th>
                  {TURNOVER_CATEGORIES.map(c => <th key={c.id}>{c.label} (HC / Terms)</th>)}
                </tr>
              </thead>
              <tbody>
                {monthlyDocs.map(d => (
                  <tr key={d.id}>
                    <td className={styles.left}>{d.month}</td>
                    <td className={styles.left}>{d.plantId}</td>
                    {TURNOVER_CATEGORIES.map(c => (
                      <td key={c.id}>{d[c.id].headcount} / {d[c.id].terminations}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <button className={styles.secondary} onClick={reset} disabled={importing}>Cancel</button>
            <button className={styles.primary} onClick={doImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${monthlyDocs.length} plant-months`}
            </button>
          </div>
        </>
      )}

      {done && (
        <div className={styles.success}>
          ✓ Imported {done.monthly} plant-months and {done.baseline} baseline record{done.baseline !== 1 ? 's' : ''}.
          The dashboard is now up to date.
          <button className={styles.secondary} onClick={reset} style={{ marginLeft: 12 }}>Import another</button>
        </div>
      )}
    </div>
  );
}
