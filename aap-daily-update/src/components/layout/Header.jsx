import { useState, useRef, useEffect } from 'react';
import { OnlineUsers } from './OnlineUsers';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import styles from './Header.module.css';

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

const BASE_TABS = [
  { id: 'EAP',      label: 'EAP Daily' },
  { id: 'GAP',      label: 'GAP Daily' },
  { id: 'SLP',      label: 'SLP Daily' },
  { id: 'absentee', label: 'Absentee'  },
];

const ADMIN_TABS = [
  { id: 'turnover', label: 'Turnover' },
];

export function Header({
  activeTab,
  onTabChange,
  // Plant Daily-specific props (only used when activeTab !== 'absentee')
  displayDate,
  isReadOnly,
  onPrevious,
  onNext,
  canGoNext,
  onExportExcel,
  onExportPrint,
  onlineUsers,
  // Shared
  user,
  onLogout,
  isDark,
  onToggleDark,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isAdmin = useIsAdmin(user);
  const TABS = isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS;
  const isDaily = activeTab !== 'absentee' && activeTab !== 'turnover';
  const logoLabel = (activeTab === 'absentee' || activeTab === 'turnover') ? 'AAP' : activeTab;

  // Close dropdown when clicking/touching outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  function selectTab(id) {
    onTabChange(id);
    setMenuOpen(false);
  }

  return (
    <header className={styles.header}>

      {/* ══ DESKTOP left: logo + title + tab nav ══ */}
      <div className={styles.desktopLeft}>
        <div className={styles.logo}>{logoLabel}</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Daily Reports</h1>
          <p className={styles.subtitle}>Advanced Assembly Products</p>
        </div>
        <div className={styles.tabNav}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={activeTab === t.id ? styles.tabActive : styles.tab}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ MOBILE top row: hamburger | brand | avatar ══ */}
      <div className={styles.mobileTopRow}>

        {/* Left: hamburger + dropdown */}
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              {/* Tab navigation */}
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={activeTab === t.id ? styles.dropdownItemActive : styles.dropdownItem}
                  onClick={() => selectTab(t.id)}
                >
                  {activeTab === t.id && <span className={styles.dropdownCheck}>✓</span>}
                  {t.label}
                </button>
              ))}

              {/* Export actions (daily tabs only) */}
              {isDaily && (
                <>
                  <div className={styles.dropdownDivider} />
                  <button
                    className={styles.dropdownItem}
                    onClick={() => { onExportPrint?.(); setMenuOpen(false); }}
                  >
                    Print PDF
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => { onExportExcel?.(); setMenuOpen(false); }}
                  >
                    Export Excel
                  </button>
                </>
              )}

              {/* Dark mode toggle */}
              <div className={styles.dropdownDivider} />
              <button
                className={styles.dropdownItem}
                onClick={() => { onToggleDark?.(); setMenuOpen(false); }}
              >
                <span className={styles.darkModeIcon} key={isDark ? 'sun' : 'moon'} style={{ marginRight: 4 }}>
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </span>
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>

              {/* Sign out */}
              <div className={styles.dropdownDivider} />
              <button
                className={`${styles.dropdownItem} ${styles.dropdownSignOut}`}
                onClick={() => { onLogout?.(); setMenuOpen(false); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Center: logo + title (perfectly centered via grid) */}
        <div className={styles.mobileBrand}>
          <div className={styles.logo}>{logoLabel}</div>
          <span className={styles.mobileTitleText}>Daily Reports</span>
        </div>

        {/* Right: online indicator + avatar */}
        <div className={styles.mobileRightSlot}>
          {isDaily && onlineUsers?.length > 0 && (
            <OnlineUsers users={onlineUsers} />
          )}
          {user && (
            <div className={styles.userAvatar} title={user.displayName || user.email}>
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ══ Date navigation (shared — centered on both desktop and mobile) ══ */}
      {isDaily && (
        <div className={styles.center}>
          <button className={styles.navBtn} onClick={onPrevious} title="Previous day">
            ‹
          </button>
          <div className={styles.dateDisplay}>
            <span className={styles.dateText}>{displayDate}</span>
            {isReadOnly && <span className={styles.readOnlyTag}>Read Only</span>}
          </div>
          <button
            className={styles.navBtn}
            onClick={onNext}
            disabled={!canGoNext}
            title="Next day"
          >
            ›
          </button>
        </div>
      )}

      {/* ══ DESKTOP right: online users + export + user area ══ */}
      <div className={styles.desktopRight}>
        {isDaily && <OnlineUsers users={onlineUsers} />}
        {isDaily && (
          <div className={styles.exportMenu}>
            <button
              className={styles.darkModeBtn}
              onClick={onToggleDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className={styles.darkModeIcon} key={isDark ? 'sun' : 'moon'}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </span>
            </button>
            <button className={styles.exportBtn} onClick={onExportPrint} title="Print / Save PDF">
              Print PDF
            </button>
            <button className={styles.exportBtn} onClick={onExportExcel} title="Export to Excel">
              Export Excel
            </button>
          </div>
        )}
        {!isDaily && (
          <button
            className={styles.darkModeBtn}
            onClick={onToggleDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className={styles.darkModeIcon} key={isDark ? 'sun' : 'moon'}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>
        )}
        {user && (
          <div className={styles.userArea}>
            <div className={styles.userAvatar} title={user.displayName || user.email}>
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <button className={styles.logoutBtn} onClick={onLogout} title="Sign out">
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
