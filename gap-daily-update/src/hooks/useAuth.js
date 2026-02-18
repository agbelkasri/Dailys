import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, microsoftProvider } from '../firebase';

export function useAuth() {
  // undefined = still loading, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, microsoftProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => signOut(auth);

  return {
    user,
    loading: user === undefined,
    error,
    login,
    logout,
  };
}
