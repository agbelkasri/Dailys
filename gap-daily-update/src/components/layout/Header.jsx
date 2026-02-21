import { OnlineUsers } from './OnlineUsers';
import styles from './Header.module.css';

export function Header({
  activeTab,
  onTabChange,
  // GAP Daily-specific props (only used when activeTab === 'daily')
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
}) {
  const isDaily = activeTab === 'daily';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>AAP</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Daily Reports</h1>
          <p className={styles.subtitle}>Advanced Assembly Products</p>
        </div>

        {/* Tab buttons — sit next to the logo/title */}
        <div className={styles.tabNav}>
          <button
            className={activeTab === 'daily' ? styles.tabActive : styles.tab}
            onClick={() => onTabChange('daily')}
          >
            GAP Daily
          </button>
          <button
            className={activeTab === 'absentee' ? styles.tabActive : styles.tab}
            onClick={() => onTabChange('absentee')}
          >
            Absentee
          </button>
        </div>
      </div>

      {/* Date navigation — only on GAP Daily tab */}
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

      <div className={styles.right}>
        {isDaily && <OnlineUsers users={onlineUsers} />}
        {isDaily && (
          <div className={styles.exportMenu}>
            <button className={styles.exportBtn} onClick={onExportPrint} title="Print / Save PDF">
              Print PDF
            </button>
            <button className={styles.exportBtn} onClick={onExportExcel} title="Export to Excel">
              Export Excel
            </button>
          </div>
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
