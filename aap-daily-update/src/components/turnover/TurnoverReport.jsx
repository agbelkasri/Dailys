import { useState } from 'react';
import { useIsAdmin } from '../../hooks/useIsAdmin';
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

// The Dashboard is visible to all authenticated users. The Excel import writes
// to Firestore and is admin-only (also enforced by security rules), so its
// sub-tab is only shown to admins.
export function TurnoverReport({ user }) {
  const isAdmin = useIsAdmin(user);
  const [subTab, setSubTab] = useState('dashboard');
  const [plantId, setPlantId] = useState('EAP');
  const [year, setYear] = useState(() => Math.max(new Date().getFullYear(), 2026));
  const years = yearOptions();

  const subTabs = isAdmin
    ? [{ id: 'dashboard', label: 'Dashboard' }, { id: 'import', label: 'Import Excel' }]
    : [{ id: 'dashboard', label: 'Dashboard' }];

  // A non-admin can never sit on the import view (e.g. if it was selected
  // before an admin/role change resolved).
  const activeSub = subTab === 'import' && !isAdmin ? 'dashboard' : subTab;

  return (
    <div className={styles.wrapper}>
      <div className={styles.subNav}>
        <div className={styles.tabs}>
          {subTabs.map(t => (
            <button
              key={t.id}
              className={activeSub === t.id ? styles.tabActive : styles.tab}
              onClick={() => setSubTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeSub === 'dashboard' && (
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
        {activeSub === 'dashboard' && (
          <MonthlyTurnoverDashboard plantId={plantId} year={year} />
        )}
        {activeSub === 'import' && isAdmin && (
          <TurnoverExcelImport onImported={() => setSubTab('dashboard')} />
        )}
      </div>
    </div>
  );
}
