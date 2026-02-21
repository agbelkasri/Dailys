import { useState } from 'react';
import { PLANTS } from '../../constants/absences';
import { SubmitView } from './SubmitView';
import { DailyView } from './DailyView';
import { MonthlyView } from './MonthlyView';
import styles from './AbsenteeReport.module.css';

export function AbsenteeReport({ user }) {
  const [subTab, setSubTab] = useState('daily');
  const [plantFilter, setPlantFilter] = useState('');

  return (
    <div className={styles.wrapper}>
      <div className={styles.subNav}>
        <div className={styles.tabs}>
          {[
            { id: 'submit',  label: 'Submit Absence' },
            { id: 'daily',   label: 'Daily View' },
            { id: 'monthly', label: 'Monthly View' },
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

        {subTab !== 'submit' && (
          <div className={styles.plantFilterWrap}>
            <label className={styles.plantLabel}>Plant:</label>
            <select
              className={styles.plantSelect}
              value={plantFilter}
              onChange={e => setPlantFilter(e.target.value)}
            >
              <option value="">All Plants</option>
              {PLANTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {subTab === 'submit'  && (
          <SubmitView user={user} onSuccess={() => setSubTab('daily')} />
        )}
        {subTab === 'daily'   && (
          <DailyView plantFilter={plantFilter} />
        )}
        {subTab === 'monthly' && (
          <MonthlyView plantFilter={plantFilter} />
        )}
      </div>
    </div>
  );
}
