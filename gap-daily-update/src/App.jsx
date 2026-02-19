import { useAuth } from './hooks/useAuth';
import { useDateNavigation } from './hooks/useDateNavigation';
import { usePresence } from './hooks/usePresence';
import { useReport } from './hooks/useReport';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { DailyReport } from './components/report/DailyReport';
import { exportToExcel, printReport } from './services/exportService';

function AppContent({ user, logout }) {
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

  // Single subscription shared between Header (export) and DailyReport (display)
  const { sections, loading, error } = useReport(selectedDate);

  const handleExportExcel = () => {
    exportToExcel(sections, selectedDate);
  };

  return (
    <>
      <Header
        displayDate={displayDate}
        isReadOnly={isReadOnly}
        onPrevious={goToPrevious}
        onNext={goToNext}
        canGoNext={canGoNext}
        user={user}
        onLogout={logout}
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
