import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDateNavigation } from './hooks/useDateNavigation';
import { usePresence } from './hooks/usePresence';
import { useReport } from './hooks/useReport';
import { useIsAdmin } from './hooks/useIsAdmin';
import { useDarkMode } from './hooks/useDarkMode';
import { useHolidays } from './hooks/useHolidays';
import { isHoliday } from './utils/holidays';
import { setHoliday } from './services/holidayService';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { DailyReport } from './components/report/DailyReport';
import { AbsenteeReport } from './components/absentee/AbsenteeReport';
import { TurnoverReport } from './components/turnover/TurnoverReport';
import { HistoricalImport } from './components/admin/HistoricalImport';
import { exportToExcel, printReport } from './services/exportService';
import { submitChangeRequest } from './services/reportService';
import { auth } from './firebase';

// Plant Daily subscriptions live here so they only run when this tab is active
function PlantDailyTab({ plantId, user, activeTab, onTabChange, onLogout, isDark, onToggleDark }) {
  const isAdmin = useIsAdmin(auth.currentUser);
  const {
    selectedDate,
    isReadOnly: isPastDay,
    goToPrevious,
    goToNext,
    canGoNext,
    displayDate,
    jumpToDate,
    today,
  } = useDateNavigation();

  // Change-request unlock: a non-admin viewing a past day can click "Request
  // Edit Access" to temporarily unlock the page, make their edits, then
  // click the same button (now labelled "Submit Changes") which logs a
  // changeRequest doc and re-locks.
  //
  // The state is keyed to (plant, date) so navigating to a different report
  // automatically returns to the locked default — when `editRequest.key`
  // doesn't match the current key, both `editRequested` and `submitState`
  // derive to safe defaults during render. No state-syncing effect needed.
  const currentKey = `${plantId}_${selectedDate}`;
  const [editRequest, setEditRequest] = useState({ key: null, submitState: 'idle' });
  const editRequested = editRequest.key === currentKey;
  const submitState   = editRequested ? editRequest.submitState : 'idle';

  // Admins edit any day; non-admins edit today + yesterday (1-day grace);
  // any other day is read-only unless the user has actively requested edit
  // access for it via the change-request button.
  const isReadOnly = isPastDay && !isAdmin && !editRequested;

  const handleRequestEdit  = () => setEditRequest({ key: currentKey, submitState: 'idle' });
  const handleCancelEdit   = () => setEditRequest({ key: null,        submitState: 'idle' });

  const handleSubmitChanges = async () => {
    setEditRequest({ key: currentKey, submitState: 'submitting' });
    try {
      await submitChangeRequest(currentKey);
      setEditRequest({ key: null, submitState: 'idle' });
    } catch (err) {
      console.error('Change request submission failed:', err);
      setEditRequest({ key: currentKey, submitState: 'error' });
    }
  };

  const reportId = `${plantId}_${selectedDate}`;

  // Holidays (per-plant closed days). Admins can toggle; non-admins just see
  // the closed state. Live config doc, so a toggle reflects everywhere fast.
  const holidays = useHolidays();
  const isHolidayDay = isHoliday(holidays, plantId, selectedDate);
  const [holidayBusy, setHolidayBusy] = useState(false);

  const handleToggleHoliday = async (next) => {
    setHolidayBusy(true);
    try {
      await setHoliday(plantId, selectedDate, next);
    } catch (err) {
      console.error('Holiday toggle failed:', err);
      alert('Could not update holiday: ' + err.message);
    } finally {
      setHolidayBusy(false);
    }
  };

  const { presenceMap, onlineUsers, setActiveSection, clearActiveSection } = usePresence(
    selectedDate,
    plantId,
    user
  );

  const { sections, loading, error } = useReport(selectedDate, plantId);

  const handleExportExcel = () => {
    exportToExcel(sections, selectedDate, plantId);
  };

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={onTabChange}
        displayDate={displayDate}
        isReadOnly={isReadOnly}
        onPrevious={goToPrevious}
        onNext={goToNext}
        canGoNext={canGoNext}
        selectedDate={selectedDate}
        onSelectDate={jumpToDate}
        maxDate={today}
        user={user}
        onLogout={onLogout}
        onExportExcel={handleExportExcel}
        onExportPrint={printReport}
        onlineUsers={onlineUsers}
        isDark={isDark}
        onToggleDark={onToggleDark}
      />
      <main>
        <DailyReport
          reportId={reportId}
          plantId={plantId}
          readOnly={isReadOnly}
          sections={sections}
          loading={loading}
          error={error}
          presenceMap={presenceMap}
          onFocusSection={setActiveSection}
          onBlurSection={clearActiveSection}
          /* Change-request controls — only meaningful when the page would
             otherwise be read-only (past day for non-admin). */
          canRequestEdit={isPastDay && !isAdmin}
          editRequested={editRequested}
          submitState={submitState}
          onRequestEdit={handleRequestEdit}
          onSubmitChanges={handleSubmitChanges}
          onCancelEdit={handleCancelEdit}
          /* Holiday controls */
          isHolidayDay={isHolidayDay}
          canToggleHoliday={isAdmin}
          onToggleHoliday={handleToggleHoliday}
          holidayToggleBusy={holidayBusy}
        />
      </main>
    </>
  );
}

const VALID_TABS = ['EAP', 'GAP', 'SLP', 'absentee', 'turnover', 'import'];
const ADMIN_ONLY_TABS = ['turnover', 'import'];

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash) ? hash : 'GAP';
}

function AppContent({ user, logout }) {
  const isAdmin = useIsAdmin(auth.currentUser);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // If a non-admin lands on an admin-only tab (e.g. via URL hash), redirect to GAP
  const safeTab = (ADMIN_ONLY_TABS.includes(activeTab) && !isAdmin) ? 'GAP' : activeTab;

  function handleTabChange(tab) {
    if (ADMIN_ONLY_TABS.includes(tab) && !isAdmin) return;
    setActiveTab(tab);
    window.location.hash = tab;
  }

  // Apply per-plant colour theme to body
  useEffect(() => {
    const plants = ['EAP', 'GAP', 'SLP'];
    if (plants.includes(safeTab)) {
      document.body.dataset.plant = safeTab;
    } else {
      delete document.body.dataset.plant;
    }
  }, [safeTab]);

  const isNonDaily = ['absentee', 'turnover', 'import'].includes(safeTab);
  if (!isNonDaily) {
    return (
      <PlantDailyTab
        plantId={safeTab}
        user={user}
        activeTab={safeTab}
        onTabChange={handleTabChange}
        onLogout={logout}
        isDark={isDark}
        onToggleDark={toggleDark}
      />
    );
  }

  return (
    <>
      <Header
        activeTab={safeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={logout}
        isDark={isDark}
        onToggleDark={toggleDark}
      />
      <main>
        {safeTab === 'absentee' && <AbsenteeReport user={user} />}
        {safeTab === 'turnover' && <TurnoverReport user={user} />}
        {safeTab === 'import'   && <HistoricalImport />}
      </main>
    </>
  );
}

export default function App() {
  const { user, loading, error, loginWithMicrosoft, logout } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#888',
        fontSize: 15,
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginWithMicrosoft={loginWithMicrosoft} error={error} />;
  }

  return <AppContent user={user} logout={logout} />;
}
