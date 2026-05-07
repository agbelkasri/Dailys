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

      // Log full error to console for debugging
      console.error('[Auth] Sign-in error:', err.code, err.message);

      const messages = {
        'auth/popup-closed-by-user':
          'Sign-in was cancelled. If the Microsoft window showed an error, check the setup steps below.',
        'auth/popup-blocked':
          'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.',
        'auth/account-exists-with-different-credential':
          'An account already exists with this email address.',
        'auth/user-disabled':
          'This account has been disabled.',
        'auth/operation-not-allowed':
          'Microsoft sign-in is not enabled yet. Enable it in the Firebase Console under Authentication → Sign-in method.',
        'auth/invalid-api-key':
          'Firebase configuration error. Check the app setup.',
        'auth/unauthorized-domain':
          'This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.',
      };
      setError(messages[err.code] || `Sign in failed (${err.code}). Check the browser console for details.`);
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
