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

  // Access sections data for export (shares the same subscription as DailyReport via React)
  const { sections } = useReport(selectedDate);

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
    return <LoginPage onLogin={login} error={error} />;
  }

  return <AppContent user={user} logout={logout} />;
}
