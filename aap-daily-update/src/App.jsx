import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDateNavigation } from './hooks/useDateNavigation';
import { usePresence } from './hooks/usePresence';
import { useReport } from './hooks/useReport';
import { useIsAdmin } from './hooks/useIsAdmin';
import { useDarkMode } from './hooks/useDarkMode';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { DailyReport } from './components/report/DailyReport';
import { AbsenteeReport } from './components/absentee/AbsenteeReport';
import { TurnoverReport } from './components/turnover/TurnoverReport';
import { exportToExcel, printReport } from './services/exportService';
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
  } = useDateNavigation();

  // Admins can edit any day; non-admins are read-only on previous days
  const isReadOnly = isPastDay && !isAdmin;

  const reportId = `${plantId}_${selectedDate}`;

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
        />
      </main>
    </>
  );
}

const VALID_TABS = ['EAP', 'GAP', 'SLP', 'absentee', 'turnover'];

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash) ? hash : 'GAP';
}

function AppContent({ user, logout }) {
  const isAdmin = useIsAdmin(auth.currentUser);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // If a non-admin lands on the turnover tab (e.g. via URL hash), redirect to GAP
  const safeTab = (activeTab === 'turnover' && !isAdmin) ? 'GAP' : activeTab;

  function handleTabChange(tab) {
    if (tab === 'turnover' && !isAdmin) return;
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

  if (safeTab !== 'absentee' && safeTab !== 'turnover') {
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
