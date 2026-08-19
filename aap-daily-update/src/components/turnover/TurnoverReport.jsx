import { useState } from 'react';
import { TURNOVER_PLANTS } from '../../constants/turnoverMonthly';
import { MonthlyTurnoverDashboard } from './MonthlyTurnoverDashboard';
import { TurnoverExcelImport } from './TurnoverExcelImport';
import styles from './TurnoverReport.module.css';

// Years to offer in the dashboard picker: 2025 (baseline year) through the
// current year, always including 2026.
function yearOptions() {
  const current = new Date().getFullYear();
  const end = Math.max(current, 2026);
  const years = [];
  for (let y = 2025; y <= end; y++) years.push(y);
  return years.reverse();
}

// This whole tab is admin-only (gated in App.jsx), so both sub-tabs are shown.
export function TurnoverReport() {
  const [subTab, setSubTab] = useState('dashboard');
  const [plantId, setPlantId] = useState('EAP');
  const [year, setYear] = useState(() => Math.max(new Date().getFullYear(), 2026));
  const years = yearOptions();

  return (
    <div className={styles.wrapper}>
      <div className={styles.subNav}>
        <div className={styles.tabs}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'import',    label: 'Import Excel' },
          ].map(t => (
            <button
              key={t.id}
              className={subTab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setSubTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'dashboard' && (
          <div className={styles.plantFilterWrap}>
            <label className={styles.plantLabel}>Plant:</label>
            <select
              className={styles.plantSelect}
              value={plantId}
              onChange={e => setPlantId(e.target.value)}
            >
              {TURNOVER_PLANTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className={styles.plantLabel}>Year:</label>
            <select
              className={styles.plantSelect}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {subTab === 'dashboard' && (
          <MonthlyTurnoverDashboard plantId={plantId} year={year} />
        )}
        {subTab === 'import' && (
          <TurnoverExcelImport onImported={() => setSubTab('dashboard')} />
        )}
      </div>
    </div>
  );
}
