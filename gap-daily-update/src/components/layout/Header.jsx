import { OnlineUsers } from './OnlineUsers';
import styles from './Header.module.css';

export function Header({
  displayDate,
  isReadOnly,
  onPrevious,
  onNext,
  canGoNext,
  user,
  onLogout,
  onExportExcel,
  onExportPrint,
  onlineUsers,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>GAP</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>GAP Daily Update</h1>
          <p className={styles.subtitle}>Submitted to Executive Team by 5 PM</p>
        </div>
      </div>

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

      <div className={styles.right}>
        <OnlineUsers users={onlineUsers} />
        <div className={styles.exportMenu}>
          <button className={styles.exportBtn} onClick={onExportPrint} title="Print / Save PDF">
            Print PDF
          </button>
          <button className={styles.exportBtn} onClick={onExportExcel} title="Export to Excel">
            Export Excel
          </button>
        </div>
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
