import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDateNavigation } from './hooks/useDateNavigation';
import { usePresence } from './hooks/usePresence';
import { useReport } from './hooks/useReport';
import { useIsAdmin } from './hooks/useIsAdmin';
import { useResponsibleEditors } from './hooks/useResponsibleEditors';
import { useDarkMode } from './hooks/useDarkMode';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { DailyReport } from './components/report/DailyReport';
import { AbsenteeReport } from './components/absentee/AbsenteeReport';
import { TurnoverReport } from './components/turnover/TurnoverReport';
import { exportToExcel, printReport } from './services/exportService';
import { auth } from './firebase';
import { getSectionsForPlant } from './constants/sections';
import { isInCurrentOrPreviousISOWeek } from './utils/weekHelpers';

/**
 * Returns a Set of section IDs the current user is permitted to edit on
 * `selectedDate` despite the page-level readOnly state. Used to grant
 * designated section editors (see /config/sectionEditors) a rolling
 * current-week + previous-week edit window for sections owned by their
 * responsible-party.
 */
function computeEditableSectionIds({
  isReadOnly, isAdmin, user, plantId, selectedDate, today, editorsByResponsible,
}) {
  if (!isReadOnly) return new Set();        // page is editable already
  if (isAdmin) return new Set();            // admins edit everything anyway
  if (!user?.email) return new Set();
  if (!isInCurrentOrPreviousISOWeek(selectedDate, today)) return new Set();

  const email = user.email.toLowerCase();
  const sections = getSectionsForPlant(plantId);
  const allowed = new Set();
  for (const section of sections) {
    const editors = editorsByResponsible[section.responsible];
    if (editors && editors.includes(email)) allowed.add(section.id);
  }
  return allowed;
}

// Plant Daily subscriptions live here so they only run when this tab is active
function PlantDailyTab({ plantId, user, activeTab, onTabChange, onLogout, isDark, onToggleDark }) {
  const isAdmin = useIsAdmin(auth.currentUser);
  const editorsByResponsible = useResponsibleEditors();
  const {
    selectedDate,
    isReadOnly: isPastDay,
    goToPrevious,
    goToNext,
    canGoNext,
    today,
    displayDate,
  } = useDateNavigation();

  // Admins can edit any day; non-admins are read-only on previous days
  const isReadOnly = isPastDay && !isAdmin;

  // Designated section editors (config/sectionEditors) get edit access to
  // sections owned by their responsible-party for the current + previous ISO
  // week, even when the page is otherwise read-only. Admins already edit any
  // day so we skip this whole computation for them. Memoization is left to
  // the React Compiler — the scan is trivially cheap (~18 sections).
  const editableSectionIds = computeEditableSectionIds({
    isReadOnly,
    isAdmin,
    user,
    plantId,
    selectedDate,
    today,
    editorsByResponsible,
  });

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
          editableSectionIds={editableSectionIds}
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
