import { useState } from 'react';
import styles from './LoginPage.module.css';

function MicrosoftLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginPage({ onLoginWithMicrosoft, error }) {
  const [loading, setLoading] = useState(false);

  const handleMicrosoft = async () => {
    setLoading(true);
    await onLoginWithMicrosoft();
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>AAP</div>
        </div>
        <h1 className={styles.title}>Daily Reports</h1>
        <p className={styles.subtitle}>Sign in with your company account to continue</p>

        <button
          className={styles.msButton}
          onClick={handleMicrosoft}
          disabled={loading}
        >
          <MicrosoftLogo />
          <span>{loading ? 'Signing in…' : 'Sign in with Microsoft'}</span>
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
