import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  OAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

// Microsoft provider — restricted to the org's Azure AD tenant.
// Set VITE_MICROSOFT_TENANT_ID in .env.local to your Directory (tenant) ID.
// Falls back to 'organizations' (any work/school account) if not set.
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  tenant: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'organizations',
  prompt: 'select_account',
});

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const loginWithMicrosoft = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, microsoftProvider);
    } catch (err) {
      // 'cancelled-popup-request' fires when the user opens multiple popups — ignore silently
      if (err.code === 'auth/cancelled-popup-request') return;

      const messages = {
        'auth/popup-closed-by-user': 'Sign-in was cancelled.',
        'auth/popup-blocked':
          'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.',
        'auth/account-exists-with-different-credential':
          'An account already exists with this email address.',
        'auth/user-disabled': 'This account has been disabled.',
      };
      setError(messages[err.code] || 'Sign in failed. Please try again.');
    }
  };

  const logout = () => signOut(auth);

  return {
    user,
    loading: user === undefined,
    error,
    loginWithMicrosoft,
    logout,
  };
}
