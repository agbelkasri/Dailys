import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDateNavigation } from './hooks/useDateNavigation';
import { usePresence } from './hooks/usePresence';
import { useReport } from './hooks/useReport';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { DailyReport } from './components/report/DailyReport';
import { AbsenteeReport } from './components/absentee/AbsenteeReport';
import { exportToExcel, printReport } from './services/exportService';

// GAP Daily subscriptions live here so they only run when this tab is active
function GapDailyTab({ user, activeTab, onTabChange, onLogout }) {
  const {
    selectedDate,
    isReadOnly,
    goToPrevious,
    goToNext,
    canGoNext,
    displayDate,
  } = useDateNavigation();

  const { presenceMap, onlineUsers, setActiveSection, clearActiveSection } = usePresence(
    selectedDate,
    user
  );

  const { sections, loading, error } = useReport(selectedDate);

  const handleExportExcel = () => {
    exportToExcel(sections, selectedDate);
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
      />
      <main>
        <DailyReport
          date={selectedDate}
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

function AppContent({ user, logout }) {
  const [activeTab, setActiveTab] = useState('daily');

  if (activeTab === 'daily') {
    return (
      <GapDailyTab
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={logout}
      />
    );
  }

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />
      <main>
        <AbsenteeReport user={user} />
      </main>
    </>
  );
}

export default function App() {
  const { user, loading, error, login, logout } = useAuth();

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
    return <LoginPage onLogin={(email, password) => login(email, password)} error={error} />;
  }

  return <AppContent user={user} logout={logout} />;
}
