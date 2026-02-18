import styles from './LoginPage.module.css';

export function LoginPage({ onLogin, error }) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>GAP</div>
        </div>
        <h1 className={styles.title}>GAP Daily Update</h1>
        <p className={styles.subtitle}>Submitted to Executive Team by 5 PM</p>

        <button className={styles.msButton} onClick={onLogin}>
          <MicrosoftIcon />
          Sign in with Microsoft
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="ms-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="20" height="20">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
